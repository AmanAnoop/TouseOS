import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, orgId } = await request.json();

  let documentContext = "";
  if (orgId) {
    const { data: docs } = await supabase.from("documents").select("title, category").eq("org_id", orgId).limit(20);
    if (docs?.length) {
      documentContext = "\n\nUploaded org documents available: " + docs.map((d: { title: string; category: string }) => `${d.title} (${d.category})`).join(", ") + ". Cite these when answering policy questions and note that full text search requires opening the Document Center.";
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      response: "AI assistant requires an OpenAI API key. Add OPENAI_API_KEY to your environment variables in Vercel or .env.local to enable this feature.\n\nCapabilities once configured:\n• Caption generator for Instagram posts\n• Event planning assistant\n• Officer transition binder generator\n• Alumni newsletter writer\n• Budget planning assistant\n• PNM text message templates\n• Meeting summary generator",
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are TouseOS AI, a helpful assistant for Greek life organizations and club sports teams. You help with:
- Writing Instagram captions and social media content
- Planning events and creating run-of-show documents
- Drafting PNM (potential new member) outreach messages (always consent-based)
- Writing alumni newsletters
- Creating budget drafts
- Summarizing meeting notes
- Writing officer transition binders
- Planning philanthropy campaigns

Important rules:
- Never make final decisions on standards cases, risk approval, discipline, recruitment acceptance, or medical matters
- Always include a reminder to review and personalize AI-generated content
- For PNM messages, always emphasize consent-based outreach only
- Keep tone professional but warm and authentic to Greek life culture
- Format responses clearly with headers, bullets, or numbered lists when appropriate
- When org documents are listed, reference them by name when answering bylaws/policy questions` + documentContext,
          },
          ...messages,
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message ?? "OpenAI API error" }, { status: 500 });
    }

    const data = await res.json();
    const response = data.choices?.[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
