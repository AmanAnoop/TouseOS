import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type RoleName } from "@/lib/permissions";

const FINANCE_ROLES: RoleName[] = ["owner", "president", "vice_president", "treasurer"];

/** President-level sign-off (e.g. high reimbursement amounts). */
export const EXECUTIVE_APPROVAL_ROLES: RoleName[] = ["owner", "president", "vice_president"];

export function isFinanceOfficerRole(role: string | null | undefined): boolean {
  return FINANCE_ROLES.includes(role as RoleName);
}

/** Same access as budget page — treasurer helpers, travel coordinators with view_payments, etc. */
export function canViewFinancePage(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role as RoleName;
  return (
    isFinanceOfficerRole(r) ||
    can(r, "manage_budget") ||
    can(r, "view_payments") ||
    can(r, "manage_payments")
  );
}

export function canManageStripeConnect(role: string | null | undefined): boolean {
  return isFinanceOfficerRole(role) || role === "advisor";
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
