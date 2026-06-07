import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-cookie";
import { getProductId, productHomePath } from "@/lib/org-product";

export function homePathForOrgType(orgType: string | null | undefined): string {
  return productHomePath(getProductId(orgType ?? "general_org"));
}

/** Client-side: set active org cookie (layout reads this on next navigation). */
export function setActiveOrgCookie(orgId: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${ACTIVE_ORG_COOKIE}=${orgId}; path=/; max-age=${maxAge}; samesite=lax`;
}
