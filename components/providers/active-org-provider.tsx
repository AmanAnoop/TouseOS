"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadActiveMembership } from "@/lib/active-org-membership";
import type { RoleName } from "@/lib/permissions";

export interface ActiveOrgSnapshot {
  orgId: string;
  userId: string;
  role: RoleName;
  orgType: string;
  orgName: string;
}

interface ActiveOrgContextValue {
  orgId: string | null;
  userId: string | null;
  role: RoleName;
  orgType: string;
  orgName: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ActiveOrgContext = createContext<ActiveOrgContextValue | null>(null);

export function ActiveOrgProvider({
  initial,
  children,
}: {
  initial: ActiveOrgSnapshot | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnapshot(null);
        return;
      }
      const membership = await loadActiveMembership(supabase, user.id);
      if (membership) {
        setSnapshot({
          orgId: membership.orgId,
          userId: user.id,
          role: membership.role,
          orgType: membership.orgType,
          orgName: membership.orgName,
        });
      } else {
        setSnapshot(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<ActiveOrgContextValue>(() => ({
    orgId: snapshot?.orgId ?? null,
    userId: snapshot?.userId ?? null,
    role: snapshot?.role ?? "general_member",
    orgType: snapshot?.orgType ?? "",
    orgName: snapshot?.orgName ?? "",
    loading,
    refresh: async () => {
      await refresh();
      router.refresh();
    },
  }), [snapshot, loading, refresh, router]);

  return (
    <ActiveOrgContext.Provider value={value}>
      {children}
    </ActiveOrgContext.Provider>
  );
}

export function useActiveOrgContext(): ActiveOrgContextValue | null {
  return useContext(ActiveOrgContext);
}
