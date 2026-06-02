"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

import type { RoleName } from "@/lib/permissions";

interface OrgContext {
  orgId: string | null;
  userId: string | null;
  role: RoleName;
  orgType: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useOrg(): OrgContext {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState("");
  const [role, setRole] = useState<RoleName>("general_member");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setOrgId(null);
      setUserId(null);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data: m } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(type)")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (m) {
      setOrgId(m.org_id);
      setOrgType(String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? ""));
      setRole(String(m.role ?? "general_member") as RoleName);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orgId, userId, role, orgType, loading, refresh };
}
