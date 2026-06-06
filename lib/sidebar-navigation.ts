import type { ProductId } from "@/lib/org-product";
import { navForProduct } from "@/lib/org-product";

/** Lucide icon keys resolved in `components/layout/sidebar-icons.tsx` */
export type SidebarIconKey =
  | "home"
  | "heart"
  | "users"
  | "calendar"
  | "dollar"
  | "book"
  | "clipboard"
  | "file"
  | "message"
  | "zap"
  | "image"
  | "shield"
  | "warehouse"
  | "building"
  | "trophy"
  | "grid"
  | "hand-heart"
  | "settings"
  | "bell"
  | "graduation"
  | "sparkles"
  | "bar-chart"
  | "layers"
  | "plane";

export interface SidebarNavItemDef {
  href: string;
  label: string;
  icon: SidebarIconKey;
  badge?: number;
}

export interface SidebarSectionDef {
  id: string;
  title: string;
  items: SidebarNavItemDef[];
}

export interface SidebarNavOptions {
  unreadCount?: number;
  hasGreekMembership?: boolean;
  platformAdmin?: boolean;
  universityAdmin?: boolean;
}

function homeHref(product: ProductId): string {
  if (product === "sports") return "/sports";
  if (product === "club") return "/club";
  return "/dashboard";
}

function mapCoreItem(
  href: string,
  label: string,
  product: ProductId,
): SidebarNavItemDef | null {
  const resolvedHref = href === "/dashboard" ? homeHref(product) : href;
  const iconMap: Record<string, SidebarIconKey> = {
    "/dashboard": "home",
    "/sports": "home",
    "/club": "home",
    "/health": "heart",
    "/roster": "users",
    "/events": "calendar",
    "/payments": "dollar",
    "/reimbursements": "dollar",
    "/budget": "book",
    "/tasks": "clipboard",
    "/documents": "file",
    "/forms": "clipboard",
    "/governance": "book",
    "/attendance-points": "trophy",
    "/engagement": "heart",
    "/comms": "message",
    "/feed": "zap",
  };
  const icon = iconMap[resolvedHref] ?? iconMap[href];
  if (!icon) return null;
  const resolvedLabel =
    resolvedHref === homeHref(product) && product === "sports"
      ? "Team home"
      : resolvedHref === homeHref(product) && product === "club"
        ? "Club home"
        : label;
  return { href: resolvedHref, label: resolvedLabel, icon };
}

function mapFeatureItem(href: string, label: string): SidebarNavItemDef {
  const iconMap: Record<string, SidebarIconKey> = {
    "/pnm": "users",
    "/big-little": "heart",
    "/social": "image",
    "/social-calendar": "calendar",
    "/social-collab": "users",
    "/social-assets": "image",
    "/risk": "shield",
    "/nme": "book",
    "/standards": "clipboard",
    "/housing": "warehouse",
    "/alumni": "users",
    "/philanthropy": "building",
    "/interchapter": "message",
    "/event-memories": "calendar",
    "/study-hours": "book",
    "/tryouts": "trophy",
    "/tournaments": "trophy",
    "/standings": "bar-chart",
    "/yearbook": "book",
    "/waivers": "shield",
    "/travel": "plane",
    "/travel/templates": "plane",
    "/equipment": "warehouse",
    "/injuries": "clipboard",
    "/coaches": "trophy",
    "/club/membership": "users",
    "/club/committees": "users",
    "/club/service-hours": "hand-heart",
    "/club/elections": "users",
  };
  return {
    href,
    label: label
      .replace("Touse Social", "Photos & posts")
      .replace("ExecLink", "Interchapter")
      .replace("Social Calendar", "Social Media"),
    icon: iconMap[href] ?? "layers",
  };
}

/** Group Greek features into clearer subsections */
function greekFeatureSections(
  items: Array<{ href: string; label: string }>,
): SidebarSectionDef[] {
  const recruitment = ["/pnm", "/big-little", "/nme"];
  const social = ["/social", "/social-calendar", "/social-collab", "/social-assets", "/event-memories"];
  const chapter = ["/travel", "/travel/templates", "/risk", "/standards", "/housing", "/engagement", "/attendance-points", "/study-hours"];
  const community = ["/alumni", "/philanthropy", "/interchapter"];

  const pick = (hrefs: string[]) =>
    items.filter((i) => hrefs.includes(i.href)).map((i) => mapFeatureItem(i.href, i.label));

  const sections: SidebarSectionDef[] = [];
  const rec = pick(recruitment);
  if (rec.length) sections.push({ id: "recruitment", title: "Recruitment", items: rec });
  const soc = pick(social);
  if (soc.length) sections.push({ id: "social", title: "Social & media", items: soc });
  const ch = pick(chapter);
  if (ch.length) sections.push({ id: "chapter-ops", title: "Chapter operations", items: ch });
  const comm = pick(community);
  if (comm.length) sections.push({ id: "community", title: "Community", items: comm });
  return sections;
}

function sportsFeatureSections(
  items: Array<{ href: string; label: string }>,
): SidebarSectionDef[] {
  const team = ["/tryouts", "/tournaments", "/standings", "/coaches", "/injuries"];
  const ops = ["/waivers", "/travel", "/travel/templates", "/equipment"];
  const other = items.filter(
    (i) => !team.includes(i.href) && !ops.includes(i.href) && i.href !== "/sports",
  );

  const sections: SidebarSectionDef[] = [];
  const t = items.filter((i) => team.includes(i.href)).map((i) => mapFeatureItem(i.href, i.label));
  if (t.length) sections.push({ id: "team", title: "Team", items: t });
  const o = items.filter((i) => ops.includes(i.href)).map((i) => mapFeatureItem(i.href, i.label));
  if (o.length) sections.push({ id: "ops", title: "Operations", items: o });
  const rest = other.map((i) => mapFeatureItem(i.href, i.label));
  if (rest.length) sections.push({ id: "more", title: "More", items: rest });
  return sections;
}

function clubFeatureSections(
  items: Array<{ href: string; label: string }>,
): SidebarSectionDef[] {
  const program = ["/club/membership", "/club/committees", "/club/service-hours", "/club/elections"];
  const rest = items.filter((i) => i.href !== "/club" && !program.includes(i.href));
  const sections: SidebarSectionDef[] = [];
  const p = items.filter((i) => program.includes(i.href)).map((i) => mapFeatureItem(i.href, i.label));
  if (p.length) sections.push({ id: "program", title: "Programs", items: p });
  const r = rest.map((i) => mapFeatureItem(i.href, i.label));
  if (r.length) sections.push({ id: "more", title: "More", items: r });
  return sections;
}

export function buildSidebarNavigation(
  product: ProductId,
  options: SidebarNavOptions = {},
): SidebarSectionDef[] {
  const { core, feature } = navForProduct(product);
  const sections: SidebarSectionDef[] = [];

  const overview: SidebarNavItemDef[] = [];
  const peopleMoney: SidebarNavItemDef[] = [];
  const work: SidebarNavItemDef[] = [];
  const comms: SidebarNavItemDef[] = [];

  for (const item of core) {
    const mapped = mapCoreItem(item.href, item.label, product);
    if (!mapped) continue;
    const h = mapped.href;
    if (h === homeHref(product) || h === "/health") overview.push(mapped);
    else if (["/roster", "/events", "/payments", "/reimbursements", "/budget"].includes(h)) {
      peopleMoney.push(mapped);
    } else if (["/comms", "/feed"].includes(h)) comms.push(mapped);
    else work.push(mapped);
  }

  if (overview.length) sections.push({ id: "overview", title: "Overview", items: overview });
  if (peopleMoney.length) sections.push({ id: "people", title: "People & finance", items: peopleMoney });
  if (work.length) sections.push({ id: "work", title: "Chapter work", items: work });
  if (comms.length) sections.push({ id: "comms", title: "Communications", items: comms });

  const featureItems = feature.map((i) => ({ href: i.href, label: i.label }));

  if (product === "greek") {
    sections.push(...greekFeatureSections(featureItems));
  } else if (product === "sports") {
    sections.push(...sportsFeatureSections(featureItems.filter((i) => i.href !== "/sports")));
  } else if (product === "club") {
    const home = featureItems.find((i) => i.href === "/club");
    if (home && sections[0]) {
      sections[0].items.unshift(mapFeatureItem(home.href, "Club dashboard"));
    }
    sections.push(...clubFeatureSections(featureItems));
  }

  const accountItems: SidebarNavItemDef[] = [
    { href: "/profile", label: "Profile", icon: "users" },
    { href: "/account", label: "Account", icon: "settings" },
    {
      href: "/notifications",
      label: "Notifications",
      icon: "bell",
      badge: options.unreadCount,
    },
  ];
  if (options.hasGreekMembership) {
    accountItems.push({ href: "/greekmatch", label: "GreekMatch", icon: "heart" });
  }
  sections.push({ id: "account", title: "Your account", items: accountItems });

  const tools: SidebarNavItemDef[] = [
    { href: "/reports", label: "Reports", icon: "bar-chart" },
    {
      href: "/transition",
      label: product === "sports" ? "Captain binder" : "Officer binder",
      icon: "book",
    },
    { href: "/admin", label: "Admin", icon: "shield" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];
  sections.push({ id: "tools", title: "Tools", items: tools });

  if (options.platformAdmin || options.universityAdmin) {
    const admin: SidebarNavItemDef[] = [];
    if (options.platformAdmin) {
      admin.push({ href: "/platform-admin", label: "Platform admin", icon: "shield" });
    }
    if (options.universityAdmin) {
      admin.push({ href: "/university-admin", label: "University admin", icon: "graduation" });
    }
    sections.push({ id: "admin", title: "Administration", items: admin });
  }

  return sections;
}
