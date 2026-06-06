import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { loadHealthScoreForOrg } from "@/lib/health-data";
import { HealthPageClient } from "@/components/health/health-page-client";
import type { HealthMetricKey } from "@/lib/health-score";

export const metadata = { title: "Health Score" };
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const result = await loadHealthScoreForOrg(supabase, membership.orgId, user.id);
  if ("error" in result) {
    return (
      <HealthPageClient
        orgId={membership.orgId}
        initial={{
          composite: null,
          metricsUsed: 0,
          metricsTotal: 0,
          meta: {},
        }}
      />
    );
  }

  return (
    <HealthPageClient
      orgId={membership.orgId}
      initial={{
        composite: result.composite,
        metricsUsed: result.metricsUsed,
        metricsTotal: result.metricsTotal,
        meta: result.meta as Partial<Record<HealthMetricKey, { score: number; hasData: boolean; detail?: string }>>,
      }}
    />
  );
}
