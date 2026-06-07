import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type RoleName } from "@/lib/permissions";

export function canManagePoints(role: RoleName): boolean {
  return can(role, "manage_events") || can(role, "edit_roster");
}

export async function getMemberProfileForUser(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("member_profiles")
    .select("id, full_name, user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getOrgRole(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}
