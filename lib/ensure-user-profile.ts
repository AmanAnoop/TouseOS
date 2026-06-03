import type { SupabaseClient } from "@supabase/supabase-js";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/** Ensure a `profiles` row exists after password or OAuth sign-in. */
export async function ensureUserProfile(
  service: SupabaseClient,
  user: AuthUser,
): Promise<{ id: string; full_name: string }> {
  const { data: existing } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const metaName = displayNameFromMetadata(user.user_metadata);
    if (metaName && !existing.full_name?.trim()) {
      await service.from("profiles").update({ full_name: metaName }).eq("id", user.id);
      return { id: existing.id, full_name: metaName };
    }
    return { id: existing.id, full_name: existing.full_name || metaName || "Member" };
  }

  const fullName = displayNameFromMetadata(user.user_metadata)
    ?? user.email?.split("@")[0]
    ?? "Member";

  const { data: created, error } = await service
    .from("profiles")
    .insert({ id: user.id, full_name: fullName })
    .select("id, full_name")
    .single();

  if (error) throw new Error(`Could not create profile: ${error.message}`);
  return created;
}

function displayNameFromMetadata(meta?: Record<string, unknown>): string | null {
  if (!meta) return null;
  const candidates = [
    meta.full_name,
    meta.name,
    meta.display_name,
    meta.preferred_username,
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  const given = String(meta.given_name ?? "").trim();
  const family = String(meta.family_name ?? "").trim();
  if (given || family) return `${given} ${family}`.trim();
  return null;
}
