import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-cookie";

function readActiveOrgIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACTIVE_ORG_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function resolveActiveOrgId(
  memberships: Array<{ org_id: string }>,
  preferredOrgId?: string | null,
): string | null {
  if (!memberships.length) return null;
  const cookieId = preferredOrgId ?? readActiveOrgIdFromCookie();
  if (cookieId && memberships.some((m) => m.org_id === cookieId)) return cookieId;
  return memberships[0].org_id;
}
