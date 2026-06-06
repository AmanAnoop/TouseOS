import type { SupabaseClient } from "@supabase/supabase-js";

/** Keep member_profiles.forms_required aligned with count of required forms. */
export async function syncFormsRequiredCount(supabase: SupabaseClient, orgId: string) {
  const { count } = await supabase
    .from("forms")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_required", true);

  await supabase
    .from("member_profiles")
    .update({ forms_required: count ?? 0 })
    .eq("org_id", orgId)
    .in("membership_status", ["active", "new_member"]);
}
