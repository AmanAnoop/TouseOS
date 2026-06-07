import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  greekmatch: true,
  interchapter: true,
  ai_assistant: true,
  stripe_payments: true,
  social_content_pack: true,
};

const SETTINGS_KEY = "feature_flags";

export function mergeFeatureFlags(
  stored: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  return { ...DEFAULT_FEATURE_FLAGS, ...(stored ?? {}) };
}

export function flagsFromEnv(): Record<string, boolean> {
  const raw = process.env.PLATFORM_FEATURE_FLAGS ?? "";
  if (!raw.trim()) return { ...DEFAULT_FEATURE_FLAGS };
  try {
    return mergeFeatureFlags(JSON.parse(raw) as Record<string, boolean>);
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

export async function getStoredFeatureFlags(
  service: SupabaseClient,
): Promise<Record<string, boolean>> {
  const { data } = await service
    .from("platform_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object") {
    return flagsFromEnv();
  }
  return mergeFeatureFlags(data.value as Record<string, boolean>);
}

export async function saveFeatureFlags(
  service: SupabaseClient,
  flags: Record<string, boolean>,
): Promise<{ error?: string }> {
  const merged = mergeFeatureFlags(flags);
  const { error } = await service.from("platform_settings").upsert({
    key: SETTINGS_KEY,
    value: merged,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return {};
}

export function isOrgSuspended(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") return false;
  return Boolean((settings as Record<string, unknown>).platform_suspended);
}
