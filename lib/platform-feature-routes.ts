import { DEFAULT_FEATURE_FLAGS } from "@/lib/platform-feature-flags";

/** Routes gated by platform feature flags (prefix match). */
export const FEATURE_FLAG_ROUTE_PREFIXES: Record<keyof typeof DEFAULT_FEATURE_FLAGS, string[]> = {
  greekmatch: ["/greekmatch", "/api/greekmatch"],
  interchapter: ["/interchapter", "/api/interchapter"],
  ai_assistant: ["/ai-assistant", "/api/ai"],
  stripe_payments: ["/payments", "/finance", "/api/stripe/checkout", "/api/stripe/connect"],
  social_content_pack: ["/api/social/content-pack"],
};

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function featureFlagForPath(pathname: string): keyof typeof DEFAULT_FEATURE_FLAGS | null {
  for (const [flag, prefixes] of Object.entries(FEATURE_FLAG_ROUTE_PREFIXES) as Array<
    [keyof typeof DEFAULT_FEATURE_FLAGS, string[]]
  >) {
    if (prefixes.some((p) => matchesRoutePrefix(pathname, p))) return flag;
  }
  return null;
}

export function isPathAllowedByFeatureFlags(
  pathname: string,
  flags: Record<string, boolean>,
): boolean {
  const flag = featureFlagForPath(pathname);
  if (!flag) return true;
  return flags[flag] !== false;
}

export function filterHrefsByFeatureFlags(
  hrefs: string[],
  flags: Record<string, boolean>,
): string[] {
  return hrefs.filter((href) => isPathAllowedByFeatureFlags(href, flags));
}
