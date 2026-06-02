"use client";

import { useOrg } from "@/hooks/use-org";
import { can, type Permission, type RoleName } from "@/lib/permissions";

export function usePermissions() {
  const { role, loading, orgId, userId } = useOrg();

  return {
    role: role as RoleName,
    orgId,
    userId,
    loading,
    can: (permission: Permission) => can(role, permission),
    isOfficer: can(role, "manage_org_settings") || can(role, "manage_payments") || can(role, "manage_recruitment"),
  };
}
