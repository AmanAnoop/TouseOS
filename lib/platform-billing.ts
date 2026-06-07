export type PlatformPlan = "starter" | "chapter" | "council" | "enterprise";

export const PLATFORM_PLANS: Array<{ id: PlatformPlan; label: string; monthlyUsd: number }> = [
  { id: "starter", label: "Starter", monthlyUsd: 0 },
  { id: "chapter", label: "Chapter", monthlyUsd: 49 },
  { id: "council", label: "Council / League", monthlyUsd: 199 },
  { id: "enterprise", label: "Enterprise", monthlyUsd: 499 },
];

export function getPlanMonthlyUsd(plan: string): number {
  return PLATFORM_PLANS.find((p) => p.id === plan)?.monthlyUsd ?? 0;
}

export function estimatePlatformMrr(
  orgs: Array<{ platform_plan?: string; platform_plan_status?: string }>,
): number {
  return orgs.reduce((sum, o) => {
    if (o.platform_plan_status === "cancelled") return sum;
    return sum + getPlanMonthlyUsd(String(o.platform_plan ?? "starter"));
  }, 0);
}
