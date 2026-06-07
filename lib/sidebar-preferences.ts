import type { ProductId } from "@/lib/org-product";
import { productHomePath } from "@/lib/org-product";
import type { SidebarSectionDef } from "@/lib/sidebar-navigation";

export interface SidebarProductPreferences {
  hiddenHrefs: string[];
  sectionOrder: Record<string, string[]>;
}

export type SidebarPreferencesMap = Partial<Record<ProductId, SidebarProductPreferences>>;

export const EMPTY_SIDEBAR_PRODUCT_PREFS: SidebarProductPreferences = {
  hiddenHrefs: [],
  sectionOrder: {},
};

export function parseSidebarPreferences(raw: unknown): SidebarPreferencesMap {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  const out: SidebarPreferencesMap = {};

  for (const product of ["greek", "sports", "club"] as const) {
    const entry = map[product];
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const hiddenHrefs = Array.isArray(obj.hiddenHrefs)
      ? obj.hiddenHrefs.filter((h): h is string => typeof h === "string")
      : [];
    const sectionOrder: Record<string, string[]> = {};
    if (obj.sectionOrder && typeof obj.sectionOrder === "object") {
      for (const [sectionId, order] of Object.entries(obj.sectionOrder as Record<string, unknown>)) {
        if (Array.isArray(order)) {
          sectionOrder[sectionId] = order.filter((h): h is string => typeof h === "string");
        }
      }
    }
    out[product] = { hiddenHrefs, sectionOrder };
  }

  return out;
}

export function getProductSidebarPrefs(
  map: SidebarPreferencesMap,
  product: ProductId,
): SidebarProductPreferences {
  return map[product] ?? { ...EMPTY_SIDEBAR_PRODUCT_PREFS };
}

export function isProtectedNavHref(href: string, product: ProductId): boolean {
  const protectedHrefs = new Set([
    productHomePath(product),
    "/settings",
    "/profile",
    "/account",
    "/notifications",
  ]);
  return protectedHrefs.has(href);
}

export function applySidebarPreferences(
  sections: SidebarSectionDef[],
  prefs: SidebarProductPreferences | null | undefined,
  product: ProductId,
): SidebarSectionDef[] {
  if (!prefs) return sections;

  const hidden = new Set(
    (prefs.hiddenHrefs ?? []).filter((h) => !isProtectedNavHref(h, product)),
  );

  return sections
    .map((section) => {
      let items = section.items.filter((item) => !hidden.has(item.href));
      const customOrder = prefs.sectionOrder?.[section.id];
      if (customOrder?.length) {
        const orderMap = new Map(customOrder.map((href, index) => [href, index]));
        items = [...items].sort((a, b) => {
          const ai = orderMap.has(a.href) ? orderMap.get(a.href)! : 10_000;
          const bi = orderMap.has(b.href) ? orderMap.get(b.href)! : 10_000;
          if (ai !== bi) return ai - bi;
          return 0;
        });
      }
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export function mergeSidebarProductPrefs(
  map: SidebarPreferencesMap,
  product: ProductId,
  prefs: SidebarProductPreferences,
): SidebarPreferencesMap {
  return { ...map, [product]: prefs };
}
