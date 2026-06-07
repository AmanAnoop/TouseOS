import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoleName } from "@/lib/permissions";

const FINANCE_ROLES: RoleName[] = ["owner", "president", "vice_president", "treasurer"];

export function isFinanceOfficerRole(role: string | null | undefined): boolean {
  return FINANCE_ROLES.includes(role as RoleName);
}

export async function getFinanceOfficerRole(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<RoleName | null> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .neq("status", "removed")
    .maybeSingle();
  const role = String(data?.role ?? "");
  return isFinanceOfficerRole(role) ? (role as RoleName) : null;
}
