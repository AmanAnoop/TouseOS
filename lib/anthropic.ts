import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { getPlatformSecret, ensurePlatformSecretsLoaded } from "@/lib/platform-secrets";
export { isAnthropicConfigured } from "@/lib/integrations";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;
let clientKey: string | null = null;

/** Server-only Anthropic client. Never import in client components. */
export async function getAnthropicClient(): Promise<Anthropic | null> {
  await ensurePlatformSecretsLoaded();
  const key = await getPlatformSecret("ANTHROPIC_API_KEY");
  if (!key) return null;
  if (!client || clientKey !== key) {
    client = new Anthropic({ apiKey: key });
    clientKey = key;
  }
  return client;
}

export function textFromClaudeMessage(content: Anthropic.Message["content"]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/** Text completion — returns assistant text or null on failure. */
export async function claudeComplete(opts: {
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
}): Promise<string | null> {
  const anthropic = await getAnthropicClient();
  if (!anthropic) return null;

  try {
    const result = await anthropic.messages.create({
      model: ANTHROPIC_DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: opts.messages,
    });
    const text = textFromClaudeMessage(result.content);
    return text || null;
  } catch {
    return null;
  }
}

type ClaudeImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Vision + text completion for form scan and similar flows. */
export async function claudeVisionComplete(opts: {
  system: string;
  userText: string;
  imageBase64: string;
  mediaType: ClaudeImageMediaType;
  maxTokens?: number;
}): Promise<string | null> {
  return claudeComplete({
    system: opts.system,
    maxTokens: opts.maxTokens ?? 4000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: opts.mediaType, data: opts.imageBase64 },
        },
        { type: "text", text: opts.userText },
      ],
    }],
  });
}
