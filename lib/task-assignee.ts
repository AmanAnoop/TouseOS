import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve assignee_name to member user_id for RLS and notifications. */
export async function resolveAssigneeUserId(
  supabase: SupabaseClient,
  orgId: string,
  assigneeName: string | null | undefined,
): Promise<string | null> {
  const name = assigneeName?.trim();
  if (!name) return null;

  const { data: members } = await supabase
    .from("member_profiles")
    .select("user_id, full_name, preferred_name")
    .eq("org_id", orgId)
    .not("user_id", "is", null);

  const lower = name.toLowerCase();
  const match = (members ?? []).find((m) => {
    const full = String(m.full_name ?? "").toLowerCase();
    const pref = String(m.preferred_name ?? "").toLowerCase();
    return full === lower || pref === lower || full.startsWith(lower) || lower.startsWith(full.split(" ")[0]);
  });

  return match?.user_id ? String(match.user_id) : null;
}
