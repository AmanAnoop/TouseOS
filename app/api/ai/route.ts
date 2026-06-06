import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, ANTHROPIC_DEFAULT_MODEL, isAnthropicConfigured } from "@/lib/anthropic";
import { buildAiOrgContext } from "@/lib/ai-org-context";

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MINUTE = 12;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= MAX_PER_MINUTE) return false;
  entry.count += 1;
  return true;
}

const SYSTEM_PROMPT = `You are TouseOS AI for campus organizations (Greek life, club sports, general clubs).
Help with dues reminders, event recaps, philanthropy reports, and budget explanations.
Never make final decisions on discipline, risk, medical, or recruitment acceptance.
Remind users to review and personalize generated content.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const orgId = body.orgId as string | undefined;
  const task = body.task as string | undefined;

  let orgContext = "";
  if (orgId) {
    orgContext = await buildAiOrgContext(supabase, orgId);
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json({
      response:
        "AI assistant requires ANTHROPIC_API_KEY on the server. Add it to .env.local to enable dues reminders, event recaps, philanthropy reports, and budget explanations.",
    });
  }

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const userContent = messages.length
    ? messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
    : task ?? "Hello";

  try {
    const result = await client.messages.create({
      model: ANTHROPIC_DEFAULT_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT + orgContext,
      messages: [{ role: "user", content: userContent }],
    });

    const block = result.content.find((b) => b.type === "text");
    const response = block && block.type === "text" ? block.text : "No response generated.";

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
