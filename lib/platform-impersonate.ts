export const IMPERSONATE_ORG_COOKIE = "touse_impersonate_org";
export const IMPERSONATE_CREATED_COOKIE = "touse_impersonate_created";

export function isPlatformImpersonationEnabled(): boolean {
  return process.env.PLATFORM_IMPERSONATION_ENABLED === "true";
}
