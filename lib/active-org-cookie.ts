export const ACTIVE_ORG_COOKIE = "touse_active_org_id";

export function activeOrgCookieHeader(orgId: string): string {
  const maxAge = 60 * 60 * 24 * 365;
  return `${ACTIVE_ORG_COOKIE}=${orgId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
