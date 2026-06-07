export type RoleName =
  | "owner"
  | "president"
  | "vice_president"
  | "treasurer"
  | "secretary"
  | "social_chair"
  | "recruitment_chair"
  | "risk_manager"
  | "philanthropy_chair"
  | "alumni_chair"
  | "nme_chair"
  | "standards_chair"
  | "pr_chair"
  | "advisor"
  | "general_member"
  | "alumni"
  | "parent"
  | "university_admin"
  // SportsOS
  | "captain"
  | "co_captain"
  | "coach"
  | "travel_coordinator"
  | "equipment_manager"
  | "safety_officer"
  | "tryout_coordinator"
  | "player"
  | "campus_rec_admin";

export type Permission =
  | "view_roster"
  | "edit_roster"
  | "view_payments"
  | "manage_payments"
  | "view_recruitment"
  | "manage_recruitment"
  | "send_mass_texts"
  | "manage_events"
  | "manage_guest_lists"
  | "view_incidents"
  | "manage_incidents"
  | "view_photos"
  | "approve_photos"
  | "view_standards"
  | "manage_standards"
  | "view_documents"
  | "manage_documents"
  | "view_reports"
  | "manage_org_settings"
  | "manage_budget"
  | "manage_housing"
  | "manage_nme"
  | "view_injuries"
  | "manage_injuries"
  | "manage_waivers"
  | "manage_tryouts"
  | "manage_travel"
  | "manage_equipment"
  | "manage_vendors"
  | "manage_alumni"
  | "admin";

const ALL: Permission[] = [
  "view_roster","edit_roster","view_payments","manage_payments",
  "view_recruitment","manage_recruitment","send_mass_texts",
  "manage_events","manage_guest_lists","view_incidents","manage_incidents",
  "view_photos","approve_photos","view_standards","manage_standards",
  "view_documents","manage_documents","view_reports","manage_org_settings",
  "manage_budget","manage_housing","manage_nme","view_injuries",
  "manage_injuries","manage_waivers","manage_tryouts","manage_travel",
  "manage_equipment","manage_vendors","manage_alumni","admin",
];

const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  owner: ALL,
  president: ALL,
  vice_president: [
    "view_roster","edit_roster","view_payments","manage_payments","manage_events",
    "manage_guest_lists","view_incidents","manage_incidents","view_photos",
    "approve_photos","view_standards","manage_standards","view_documents",
    "manage_documents","view_reports","manage_org_settings","manage_budget",
    "manage_nme","manage_vendors","manage_alumni",
  ],
  treasurer: [
    "view_roster","view_payments","manage_payments","view_reports",
    "manage_budget","view_documents","manage_documents",
  ],
  secretary: [
    "view_roster","edit_roster","manage_events","view_documents",
    "manage_documents","view_reports","manage_org_settings",
  ],
  social_chair: [
    "view_roster","manage_events","manage_guest_lists","view_photos",
    "approve_photos","view_documents","view_reports",
  ],
  recruitment_chair: [
    "view_roster","manage_events","view_recruitment","manage_recruitment",
    "send_mass_texts","view_photos","view_reports",
  ],
  risk_manager: [
    "view_roster","manage_events","manage_guest_lists","view_incidents",
    "manage_incidents","view_documents","manage_documents","view_reports",
  ],
  philanthropy_chair: [
    "view_roster","manage_events","view_photos","view_documents",
    "manage_documents","view_reports","manage_alumni",
  ],
  alumni_chair: [
    "view_roster","view_reports","manage_alumni","view_documents",
  ],
  nme_chair: [
    "view_roster","manage_events","manage_nme","view_documents",
    "manage_documents","view_reports",
  ],
  standards_chair: [
    "view_roster","view_standards","manage_standards","view_incidents",
    "manage_incidents","view_reports",
  ],
  pr_chair: [
    "view_roster","manage_events","view_photos","approve_photos",
    "view_documents","view_reports",
  ],
  advisor: [
    "view_roster","view_payments","view_incidents","manage_incidents",
    "view_standards","manage_standards","view_reports","view_documents",
    "view_injuries",
  ],
  general_member: [
    "view_roster","view_photos","view_documents",
  ],
  alumni: ["view_roster","view_photos"],
  parent: [],
  university_admin: [
    "view_roster","view_reports","view_incidents","view_standards",
  ],
  // Sports
  captain: [
    "view_roster","edit_roster","manage_events","manage_guest_lists",
    "view_photos","approve_photos","view_documents","manage_documents",
    "view_reports","manage_travel","manage_tryouts","view_injuries",
    "manage_injuries","manage_waivers","manage_equipment",
  ],
  co_captain: [
    "view_roster","edit_roster","manage_events","view_photos",
    "view_documents","view_reports","manage_travel","view_injuries",
  ],
  coach: [
    "view_roster","edit_roster","manage_events","view_reports",
    "view_injuries","manage_injuries","manage_tryouts",
  ],
  travel_coordinator: [
    "view_roster","manage_travel","view_payments","view_reports",
    "manage_waivers",
  ],
  equipment_manager: [
    "view_roster","manage_equipment","view_reports",
  ],
  safety_officer: [
    "view_roster","view_incidents","manage_incidents","view_injuries",
    "manage_injuries","manage_waivers","view_reports",
  ],
  tryout_coordinator: [
    "view_roster","manage_tryouts","manage_events","view_reports",
  ],
  player: ["view_roster","view_photos","view_documents"],
  campus_rec_admin: [
    "view_roster","view_reports","view_incidents","manage_waivers",
  ],
};

export function can(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: RoleName): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const GREEK_ROLES: RoleName[] = [
  "owner","president","vice_president","treasurer","secretary",
  "social_chair","recruitment_chair","risk_manager","philanthropy_chair",
  "alumni_chair","nme_chair","standards_chair","pr_chair",
  "advisor","general_member","alumni","parent","university_admin",
];

export const SPORTS_ROLES: RoleName[] = [
  "captain","co_captain","coach","treasurer","travel_coordinator",
  "equipment_manager","safety_officer","tryout_coordinator","player",
  "alumni","parent","campus_rec_admin",
];

export const ROLE_LABELS: Record<RoleName, string> = {
  owner: "Owner/Admin",
  president: "President",
  vice_president: "Vice President",
  treasurer: "Treasurer",
  secretary: "Secretary",
  social_chair: "Social Chair",
  recruitment_chair: "Recruitment Chair",
  risk_manager: "Risk Manager",
  philanthropy_chair: "Philanthropy Chair",
  alumni_chair: "Alumni Chair",
  nme_chair: "New Member Educator",
  standards_chair: "Standards Chair",
  pr_chair: "PR/Social Media Chair",
  advisor: "Advisor",
  general_member: "General Member",
  alumni: "Alumni/Alumnae",
  parent: "Parent/Guardian",
  university_admin: "University Admin",
  captain: "Captain",
  co_captain: "Co-Captain",
  coach: "Coach",
  travel_coordinator: "Travel Coordinator",
  equipment_manager: "Equipment Manager",
  safety_officer: "Safety Officer",
  tryout_coordinator: "Tryout Coordinator",
  player: "Player",
  campus_rec_admin: "Campus Recreation Admin",
};
