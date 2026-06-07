import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isMissingPlatformPlanColumn,
  withPlatformPlanDefaults,
} from "@/lib/platform-plan-columns";

/** Load one org; works before migration 022 (no platform_plan columns). */
export async function fetchOrganizationById(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> {
  const withPlan = await supabase
    .from("organizations")
    .select("*, platform_plan, platform_plan_status")
    .eq("id", orgId)
    .maybeSingle();

  if (!isMissingPlatformPlanColumn(withPlan.error)) {
    return {
      data: withPlan.data ? withPlatformPlanDefaults(withPlan.data as Record<string, unknown>) : null,
      error: withPlan.error,
    };
  }

  const base = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
  return {
    data: base.data ? withPlatformPlanDefaults(base.data as Record<string, unknown>) : null,
    error: base.error,
  };
}
