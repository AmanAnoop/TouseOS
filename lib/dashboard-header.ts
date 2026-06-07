import type { ProductAccent } from "@/lib/org-product";

/** Breadcrumb suffix for dashboard home pages (Greek, sports, club). */
export function dashboardViewLabel(product: ProductAccent, isOfficer: boolean): string {
  if (product === "sports") return isOfficer ? "Officer view" : "Player view";
  return isOfficer ? "Officer view" : "Member view";
}
