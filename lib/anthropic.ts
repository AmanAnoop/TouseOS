import Anthropic from "@anthropic-ai/sdk";
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
