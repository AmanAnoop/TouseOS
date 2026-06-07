import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, ANTHROPIC_DEFAULT_MODEL, isAnthropicConfigured } from "@/lib/anthropic";
import { requirePlatformFeature } from "@/lib/platform-api-guard";
import { starterChecklist, tripTypesForProduct, type TravelProduct } from "@/lib/travel-config";

const SYSTEM = `You are a campus travel planner for Greek chapters and club sports teams.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "tripName": string,
  "tripType": string,
  "destination": string,
  "departureLocation": string,
  "venueName": string,
  "startDate": "YYYY-MM-DD or empty",
  "endDate": "YYYY-MM-DD or empty",
  "estimatedAttendees": number,
  "itinerarySummary": string,
  "checklist": string[],
  "budgetLineItems": Array<{ "category": string, "label": string, "estimatedAmount": number }>,
  "perPersonEstimate": number,
  "tips": string[]
}
Use realistic USD estimates. Include transportation, lodging, food, and registration where relevant.
Never approve risky activities without noting officer review.`;

export async function POST(request: Request) {
  const blocked = await requirePlatformFeature("ai_assistant");
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { orgId, prompt, product = "greek", attendeeCount } = body as {
    orgId?: string;
    prompt?: string;
    product?: TravelProduct;
    attendeeCount?: number;
  };

  if (!orgId || !prompt?.trim()) {
    return NextResponse.json({ error: "orgId and prompt required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isAnthropicConfigured()) {
    return NextResponse.json({
      error: "AI not configured",
      hint: "Add ANTHROPIC_API_KEY to config/keys/keys.env or Settings → API keys",
    }, { status: 503 });
  }

  const client = await getAnthropicClient();
  if (!client) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const tripTypes = tripTypesForProduct(product).map((t) => t.value).join(", ");
  const count = attendeeCount ?? 20;

  try {
    const result = await client.messages.create({
      model: ANTHROPIC_DEFAULT_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Product: ${product}\nAttendees: ${count}\nValid trip types: ${tripTypes}\nDefault checklist for formal: ${starterChecklist(product, "formal").join("; ")}\n\nPlan request: ${prompt.trim()}`,
      }],
    });

    const block = result.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "Could not parse travel plan" }, { status: 500 });
    }

    const plan = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({ plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Travel planning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
