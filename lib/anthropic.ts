import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Server-only Anthropic client. Never import in client components. */
export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  if (!client) {
    client = new Anthropic({ apiKey: key });
  }
  return client;
}
