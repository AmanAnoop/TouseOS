import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FORM_SCAN_SYSTEM_PROMPT,
  parseFormScanJson,
  type ScannedFormDraft,
} from "@/lib/form-ai";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI form scan requires OPENAI_API_KEY in your environment.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Upload an image of the form (file field)." }, { status: 400 });
  }

  const mime = file.type || "image/jpeg";
  if (mime === "application/pdf") {
    return NextResponse.json(
      {
        error:
          "PDF upload is not supported yet. Take a photo or screenshot of the form and upload as PNG or JPEG.",
      },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  const hints = String(formData.get("hints") ?? "").trim();
  const userText = hints
    ? `Additional context from the officer: ${hints}\n\nExtract the form from this image.`
    : "Extract the form from this image.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: FORM_SCAN_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        (err as { error?: { message?: string } }).error?.message ?? "OpenAI API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "No structured output from AI." }, { status: 500 });
    }

    const draft: ScannedFormDraft | null = parseFormScanJson(content);
    if (!draft) {
      return NextResponse.json(
        { error: "Could not parse form structure from the scan. Try a clearer photo." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      draft,
      disclaimer:
        "Review all AI-extracted fields before publishing. AI may miss or mislabel items on complex forms.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
