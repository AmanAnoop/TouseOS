/** Product skins — distinct experiences on shared TouseOS platform */
export type ProductId = "greek" | "sports" | "club" | "university";

export function getProductId(orgType: string): ProductId {
  if (orgType === "fraternity" || orgType === "sorority") return "greek";
  if (orgType === "club_sports") return "sports";
  if (orgType === "general_org") return "club";
  if (orgType === "university") return "university";
  return "club";
}

/** Internal / analytics label — not for authenticated UI chrome. */
export function productLabel(product: ProductId): string {
  const map: Record<ProductId, string> = {
    greek: "TouseGreek",
    sports: "SportsOS",
    club: "ClubOS",
    university: "University",
  };
  return map[product];
}

/** User-facing org type labels (sign-up, onboarding, dashboards). */
export function userFacingOrgTypeLabel(orgType: string): string {
  if (orgType === "fraternity") return "Fraternity / Men's Spirit Org";
  if (orgType === "sorority") return "Sorority / Women's Spirit Org";
  if (orgType === "club_sports") return "Club Sport";
  if (orgType === "general_org") return "Student Club / Organization";
  return "Organization";
}

export function productHomePath(product: ProductId): string {
  if (product === "sports") return "/sports";
  if (product === "club") return "/club";
  return "/dashboard";
}

export type ProductAccent = "greek" | "sports" | "club";

export function productAccent(product: ProductId): ProductAccent {
  if (product === "sports") return "sports";
  if (product === "club") return "club";
  return "greek";
}

/** Routes only accessible by one product (prefix match) */
const GREEK_ONLY_PREFIXES = [
  "/pnm",
  "/big-little",
  "/risk",
  "/nme",
  "/standards",
  "/housing",
  "/alumni",
  "/interchapter",
  "/greekmatch",
  "/engagement",
  "/event-memories",
  "/social-calendar",
  "/social-collab",
  "/social-assets",
  "/study-hours",
];

const SPORTS_ONLY_PREFIXES = [
  "/sports",
  "/tryouts",
  "/tournaments",
  "/standings",
  "/waivers",
  "/equipment",
  "/injuries",
  "/coaches",
];

const CLUB_ONLY_PREFIXES = ["/club"];

const SHARED_PREFIXES = [
  "/dashboard",
  "/health",
  "/roster",
  "/events",
  "/payments",
  "/reimbursements",
  "/budget",
  "/finance",
  "/tasks",
  "/documents",
  "/forms",
  "/comms",
  "/feed",
  "/reports",
  "/transition",
  "/vendors",
  "/ai-assistant",
  "/admin",
  "/settings",
  "/profile",
  "/account",
  "/notifications",
  "/onboarding",
  "/pay",
  "/platform-admin",
  "/university-admin",
];

/** Social & media — all member-facing org types except university */
const SOCIAL_PREFIXES = ["/social", "/yearbook"];

/** Philanthropy / fundraising */
const FUNDRAISING_PREFIXES = ["/philanthropy"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function userHasGreekOrg(orgs: { type: string }[]): boolean {
  return orgs.some((o) => o.type === "fraternity" || o.type === "sorority");
}

export interface RouteAllowOptions {
  /** Allow Greek-only routes when the user belongs to any fraternity/sorority (multi-org). */
  hasGreekMembership?: boolean;
}

export function isRouteAllowed(
  orgType: string,
  pathname: string,
  options?: RouteAllowOptions,
): boolean {
  const product = getProductId(orgType);
  if (product === "university") return true;

  if (
    options?.hasGreekMembership
    && matchesPrefix(pathname, ["/greekmatch"])
  ) {
    return true;
  }

  if (matchesPrefix(pathname, SHARED_PREFIXES)) return true;
  if (matchesPrefix(pathname, SOCIAL_PREFIXES)) {
    return product === "greek" || product === "sports" || product === "club";
  }
  if (matchesPrefix(pathname, FUNDRAISING_PREFIXES)) {
    return product === "greek" || product === "sports" || product === "club";
  }

  if (matchesPrefix(pathname, ["/travel"])) {
    return product === "greek" || product === "sports";
  }

  if (matchesPrefix(pathname, GREEK_ONLY_PREFIXES)) return product === "greek";
  if (matchesPrefix(pathname, SPORTS_ONLY_PREFIXES)) return product === "sports";
  if (matchesPrefix(pathname, CLUB_ONLY_PREFIXES)) return product === "club";

  // Greek-skewed modules hidden from sports/club
  if (matchesPrefix(pathname, ["/governance", "/attendance-points"])) {
    return product === "greek";
  }

  return true;
}

export interface NavItemDef {
  href: string;
  label: string;
  products: ProductId[];
}

export const CORE_NAV: NavItemDef[] = [
  { href: "/dashboard", label: "Dashboard", products: ["greek", "sports", "club"] },
  { href: "/health", label: "Health Score", products: ["greek", "sports", "club"] },
  { href: "/roster", label: "Member Roster", products: ["greek", "club"] },
  { href: "/roster", label: "Team Roster", products: ["sports"] },
  { href: "/events", label: "Events", products: ["greek", "sports", "club"] },
  { href: "/payments", label: "Dues & Payments", products: ["greek", "club"] },
  { href: "/payments", label: "Team Payments", products: ["sports"] },
  { href: "/reimbursements", label: "Reimbursements", products: ["greek", "sports", "club"] },
  { href: "/finance", label: "Budget & Finance", products: ["greek", "sports", "club"] },
  { href: "/tasks", label: "Tasks", products: ["greek", "sports", "club"] },
  { href: "/documents", label: "Documents", products: ["greek", "sports", "club"] },
  { href: "/forms", label: "Forms", products: ["club"] },
  { href: "/forms", label: "Forms & Waivers", products: ["sports"] },
  { href: "/forms", label: "Forms", products: ["greek"] },
  { href: "/governance", label: "Governance", products: ["greek"] },
  { href: "/attendance-points", label: "Points System", products: ["greek"] },
  { href: "/engagement", label: "Engagement", products: ["greek"] },
  { href: "/comms", label: "Communications", products: ["greek", "sports", "club"] },
  { href: "/feed", label: "Chapter Feed", products: ["greek"] },
  { href: "/feed", label: "Team Feed", products: ["sports"] },
  { href: "/feed", label: "Org Feed", products: ["club"] },
];

export const GREEK_FEATURE_NAV: NavItemDef[] = [
  { href: "/pnm", label: "PNM Recruitment", products: ["greek"] },
  { href: "/big-little", label: "Big/Little", products: ["greek"] },
  { href: "/travel", label: "Travel", products: ["greek"] },
  { href: "/social", label: "Photos & posts", products: ["greek"] },
  { href: "/social-calendar", label: "Social Media", products: ["greek"] },
  { href: "/social-collab", label: "Collab planner", products: ["greek"] },
  { href: "/social-assets", label: "Asset Library", products: ["greek"] },
  { href: "/risk", label: "Risk Management", products: ["greek"] },
  { href: "/nme", label: "New Members", products: ["greek"] },
  { href: "/standards", label: "Standards", products: ["greek"] },
  { href: "/housing", label: "Housing", products: ["greek"] },
  { href: "/alumni", label: "Alumni CRM", products: ["greek"] },
  { href: "/philanthropy", label: "Philanthropy", products: ["greek"] },
  { href: "/interchapter", label: "Interchapter", products: ["greek"] },
  { href: "/event-memories", label: "Memories", products: ["greek"] },
  { href: "/study-hours", label: "Study Hours", products: ["greek"] },
];

export const SPORTS_FEATURE_NAV: NavItemDef[] = [
  { href: "/tryouts", label: "Tryouts", products: ["sports"] },
  { href: "/tournaments", label: "Tournaments", products: ["sports"] },
  { href: "/standings", label: "League Standings", products: ["sports"] },
  { href: "/social", label: "Photos & Social", products: ["sports"] },
  { href: "/yearbook", label: "Season Yearbook", products: ["sports"] },
  { href: "/waivers", label: "Waivers & Compliance", products: ["sports"] },
  { href: "/travel", label: "Travel", products: ["sports"] },
  { href: "/equipment", label: "Equipment & Uniforms", products: ["sports"] },
  { href: "/injuries", label: "Injury Reports", products: ["sports"] },
  { href: "/coaches", label: "Coaching Tools", products: ["sports"] },
  { href: "/philanthropy", label: "Fundraising", products: ["sports"] },
];

export const CLUB_FEATURE_NAV: NavItemDef[] = [
  { href: "/club", label: "Club Dashboard", products: ["club"] },
  { href: "/club/membership", label: "Membership", products: ["club"] },
  { href: "/club/committees", label: "Committees", products: ["club"] },
  { href: "/club/service-hours", label: "Service Hours", products: ["club"] },
  { href: "/club/elections", label: "Officer Elections", products: ["club"] },
  { href: "/social", label: "Photos & Updates", products: ["club"] },
  { href: "/philanthropy", label: "Fundraising", products: ["club"] },
  { href: "/yearbook", label: "Year in Review", products: ["club"] },
];

export function navForProduct(product: ProductId): {
  core: NavItemDef[];
  feature: NavItemDef[];
  featureSectionTitle: string;
} {
  const filter = (items: NavItemDef[]) =>
    items.filter((i) => i.products.includes(product));

  const dedupeByHref = (items: NavItemDef[]) => {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (seen.has(i.href)) return false;
      seen.add(i.href);
      return true;
    });
  };

  if (product === "greek") {
    return {
      core: dedupeByHref(filter(CORE_NAV)),
      feature: filter(GREEK_FEATURE_NAV),
      featureSectionTitle: "Greek Life",
    };
  }
  if (product === "sports") {
    return {
      core: dedupeByHref(filter(CORE_NAV)),
      feature: filter(SPORTS_FEATURE_NAV),
      featureSectionTitle: "Team",
    };
  }
  if (product === "club") {
    return {
      core: dedupeByHref(filter(CORE_NAV)),
      feature: filter(CLUB_FEATURE_NAV),
      featureSectionTitle: "Organization",
    };
  }
  return { core: dedupeByHref(filter(CORE_NAV)), feature: [], featureSectionTitle: "" };
}

export const CLUB_EVENT_TYPES = [
  { value: "general_meeting", label: "General meeting" },
  { value: "workshop", label: "Workshop / training" },
  { value: "service", label: "Community service" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "social", label: "Social event" },
  { value: "recruitment", label: "Membership info session" },
  { value: "speaker", label: "Guest speaker" },
  { value: "conference", label: "Conference / competition" },
  { value: "election", label: "Officer elections" },
  { value: "retreat", label: "Retreat / bonding" },
  { value: "other", label: "Other" },
] as const;

export const SPORTS_EVENT_TYPES = [
  { value: "practice", label: "Practice" },
  { value: "game", label: "Game" },
  { value: "tournament", label: "Tournament" },
  { value: "tryout", label: "Tryout" },
  { value: "team_meeting", label: "Team meeting" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "travel", label: "Travel event" },
  { value: "conditioning", label: "Conditioning session" },
  { value: "alumni_game", label: "Alumni game" },
  { value: "volunteer", label: "Volunteer event" },
  { value: "other", label: "Other" },
] as const;

export const GREEK_EVENT_TYPES = [
  { value: "chapter_meeting", label: "Chapter meeting" },
  { value: "recruitment", label: "Recruitment event" },
  { value: "mixer", label: "Mixer" },
  { value: "formal", label: "Formal" },
  { value: "date_party", label: "Date party" },
  { value: "brotherhood", label: "Brotherhood event" },
  { value: "sisterhood", label: "Sisterhood event" },
  { value: "philanthropy", label: "Philanthropy event" },
  { value: "service", label: "Service event" },
  { value: "tailgate", label: "Tailgate" },
  { value: "alumni_event", label: "Alumni event" },
  { value: "new_member_education", label: "New member education" },
  { value: "standards", label: "Standards meeting" },
  { value: "retreat", label: "Retreat" },
  { value: "other", label: "Other" },
] as const;

export function eventTypesForOrgType(orgType: string) {
  const product = getProductId(orgType);
  if (product === "sports") return [...SPORTS_EVENT_TYPES];
  if (product === "club") return [...CLUB_EVENT_TYPES];
  return [...GREEK_EVENT_TYPES];
}
