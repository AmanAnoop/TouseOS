/** Roles that see officer-level dashboard layout and shortcuts. */
export const DASHBOARD_OFFICER_ROLES = new Set([
  "owner",
  "president",
  "vice_president",
  "treasurer",
  "secretary",
  "social_chair",
  "recruitment_chair",
  "risk_manager",
  "philanthropy_chair",
  "alumni_chair",
  "nme_chair",
  "standards_chair",
  "pr_chair",
  "advisor",
  "captain",
  "co_captain",
  "coach",
  "travel_coordinator",
  "equipment_manager",
  "safety_officer",
  "tryout_coordinator",
]);

export function isDashboardOfficer(role: string): boolean {
  return DASHBOARD_OFFICER_ROLES.has(role);
}
