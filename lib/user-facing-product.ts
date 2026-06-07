/** User-facing product names — never expose SportsOS / ClubOS in authenticated UI. */

import type { ProductId } from "@/lib/org-product";

/** Primary product name shown in sidebar, breadcrumbs, and chrome. */
export function userFacingProductName(product?: ProductId): string {
  void product;
  return "TouseOS";
}

export function userFacingHomeLabel(orgType: string): string {
  if (orgType === "club_sports") return "Team home";
  if (orgType === "general_org") return "Organization home";
  return "Dashboard";
}

export function userFacingOrgDescription(orgType: string): string {
  if (orgType === "club_sports") return "Club sports team workspace";
  if (orgType === "general_org") return "Student organization workspace";
  return "Chapter workspace";
}

export function userFacingModulesTitle(product: ProductId): string {
  if (product === "sports") return "Team modules";
  if (product === "club") return "Organization modules";
  return "Chapter modules";
}

export function userFacingRosterBreadcrumb(orgType: string): string {
  if (orgType === "club_sports") return "Team";
  if (orgType === "general_org") return "Organization";
  return "Chapter";
}
