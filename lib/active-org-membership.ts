import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveOrgId } from "@/lib/active-org-client";
import type { RoleName } from "@/lib/permissions";

export interface ActiveMembership {
  orgId: string;
  role: RoleName;
  orgType: string;
  orgName: string;
}

/** Resolve the user's active org membership (cookie-aware). */
export async function loadActiveMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveMembership | null> {
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(type, name)")
    .eq("user_id", userId)
    .neq("status", "removed");

  if (!memberships?.length) return null;

  const activeId = resolveActiveOrgId(memberships);
  const row = memberships.find((m) => m.org_id === activeId);
  if (!row) return null;

  const org = row.organizations as { type?: string; name?: string } | null;

  return {
    orgId: row.org_id,
    role: String(row.role ?? "general_member") as RoleName,
    orgType: String(org?.type ?? "general_org"),
    orgName: String(org?.name ?? "Organization"),
  };
}
