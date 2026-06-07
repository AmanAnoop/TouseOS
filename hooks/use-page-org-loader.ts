"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/hooks/use-org";

/**
 * Runs a data loader when the active org is ready.
 * Avoids pages stuck on loading=true when orgId is still resolving or missing.
 */
export function usePageOrgLoader(
  loader: (orgId: string) => void | Promise<void>,
  deps: unknown[] = [],
) {
  const org = useOrg();
  const { orgId, loading: orgLoading } = org;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgLoading) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.resolve(loader(orgId)).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgLoading, ...deps]);

  return {
    ...org,
    loading: orgLoading || loading,
    pageLoading: loading,
  };
}
