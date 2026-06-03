"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadActiveMembership } from "@/lib/active-org-membership";
import type { RoleName } from "@/lib/permissions";

interface OrgContext {
  orgId: string | null;
  userId: string | null;
  role: RoleName;
  orgType: string;
  orgName: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useOrg(): OrgContext {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<RoleName>("general_member");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setOrgId(null);
      setUserId(null);
      setOrgType("");
      setOrgName("");
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const membership = await loadActiveMembership(supabase, user.id);
    if (membership) {
      setOrgId(membership.orgId);
      setOrgType(membership.orgType);
      setOrgName(membership.orgName);
      setRole(membership.role);
    } else {
      setOrgId(null);
      setOrgType("");
      setOrgName("");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orgId, userId, role, orgType, orgName, loading, refresh };
}
