/** organizations.platform_plan — added in migration 022_wave8_platform_billing.sql */

export const DEFAULT_PLATFORM_PLAN = "starter";
export const DEFAULT_PLATFORM_PLAN_STATUS = "active";

export function isMissingPlatformPlanColumn(error: { message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return m.includes("platform_plan") || (m.includes("organizations") && m.includes("schema cache"));
}

export const PLATFORM_PLAN_MIGRATION_HINT =
  "Apply supabase/migrations/022_wave8_platform_billing.sql (adds organizations.platform_plan).";

export function withPlatformPlanDefaults<T extends Record<string, unknown>>(org: T): T & {
  platform_plan: string;
  platform_plan_status: string;
} {
  return {
    ...org,
    platform_plan: String(org.platform_plan ?? DEFAULT_PLATFORM_PLAN),
    platform_plan_status: String(org.platform_plan_status ?? DEFAULT_PLATFORM_PLAN_STATUS),
  };
}
