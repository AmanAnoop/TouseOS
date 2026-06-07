"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadActiveMembership } from "@/lib/active-org-membership";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
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

function useOrgFallback(enabled: boolean): OrgContext {
  const supabase = useMemo(() => createClient(), []);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<RoleName>("general_member");
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
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
  }, [supabase, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, enabled]);

  return { orgId, userId, role, orgType, orgName, loading, refresh };
}

export function useOrg(): OrgContext {
  const fromProvider = useActiveOrgContext();
  const fallback = useOrgFallback(!fromProvider);
  if (fromProvider) return fromProvider;
  return fallback;
}
