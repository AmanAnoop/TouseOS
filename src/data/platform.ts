import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardCheck,
  Images,
  Megaphone,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type OrganizationType =
  | "Fraternity"
  | "Sorority"
  | "Club Sports Team"
  | "General Student Organization"
  | "University/Admin Organization";

export type MemberStatus =
  | "active"
  | "pending invite"
  | "inactive"
  | "alumni"
  | "removed"
  | "advisor"
  | "admin"
  | "new member"
  | "injured"
  | "tryout candidate";

export type Permission =
  | "view roster"
  | "edit roster"
  | "view payments"
  | "manage payments"
  | "view recruitment/PNMs"
  | "manage recruitment/PNMs"
  | "send mass texts"
  | "manage events"
  | "manage guest lists"
  | "view incident reports"
  | "manage incident reports"
  | "view photos"
  | "approve photos for posting"
  | "view standards cases"
  | "manage standards cases"
  | "view documents"
  | "manage documents"
  | "view reports"
  | "manage organization settings";

export type RoleName =
  | "Owner/Admin"
  | "President"
  | "Vice President"
  | "Treasurer"
  | "Secretary"
  | "Social Chair"
  | "Recruitment Chair"
  | "Risk Manager"
  | "Philanthropy Chair"
  | "Advisor"
  | "General Member"
  | "Captain"
  | "Coach"
  | "Travel Coordinator"
  | "Campus Recreation Admin";

export type EventType =
  | "chapter meeting"
  | "recruitment event"
  | "mixer"
  | "formal"
  | "philanthropy event"
  | "practice"
  | "game"
  | "tournament"
  | "tryout"
  | "travel event"
  | "general meeting";

export type PaymentCategory =
  | "chapter dues"
  | "national dues"
  | "social fees"
  | "philanthropy tickets"
  | "team dues"
  | "tournament fees"
  | "travel deposits"
  | "uniform payments"
  | "league fees";

export type PaymentStatus = "paid" | "partial" | "overdue" | "pending";

export interface RoleDefinition {
  name: RoleName;
  permissions: Permission[];
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  campus: string;
  councilOrLeague: string;
  color: string;
  logo: string;
  contactEmail: string;
  privacy: "public" | "private";
  officers: string[];
}

export interface Member {
  id: string;
  organizationId: string;
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  classYear: string;
  graduationYear: number;
  major: string;
  hometown: string;
  status: MemberStatus;
  role: RoleName;
  committees: string[];
  paymentStatus: PaymentStatus;
  attendanceRate: number;
  formsComplete: number;
  formsRequired: number;
  notes?: string;
}

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  rsvpCount: number;
  capacity: number;
  checkedIn: number;
  budget: number;
  requiresForms: boolean;
  riskLevel: "low" | "medium" | "high";
}

export interface Payment {
  id: string;
  organizationId: string;
  memberId: string;
  category: PaymentCategory;
  label: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAmount: number;
}

export interface PnmLead {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email: string;
  instagram?: string;
  status:
    | "lead"
    | "contacted"
    | "invited"
    | "attended"
    | "interested"
    | "high priority"
    | "bid discussion"
    | "bid extended"
    | "accepted"
    | "declined";
  source: string;
  consent: {
    optedIn: boolean;
    timestamp?: string;
    source?: string;
  };
  relationshipOwner: string;
  evaluation: {
    character: number;
    involvement: number;
    leadership: number;
    mutualInterest: number;
    riskConcern: "none" | "watch" | "high";
  };
}

export interface SocialAsset {
  id: string;
  organizationId: string;
  eventTitle: string;
  photos: number;
  approved: number;
  needsReview: number;
  captionDraft: string;
  compliance: string[];
}

export interface SportsReadiness {
  organizationId: string;
  activePlayers: number;
  injuredPlayers: number;
  waiverCompletion: number;
  travelReadiness: number;
  equipmentReturned: number;
  unpaidTravelFees: number;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface FeatureModule {
  id: string;
  label: string;
  summary: string;
  icon: LucideIcon;
  mvp: boolean;
  permissions: Permission[];
}

const allPermissions: Permission[] = [
  "view roster",
  "edit roster",
  "view payments",
  "manage payments",
  "view recruitment/PNMs",
  "manage recruitment/PNMs",
  "send mass texts",
  "manage events",
  "manage guest lists",
  "view incident reports",
  "manage incident reports",
  "view photos",
  "approve photos for posting",
  "view standards cases",
  "manage standards cases",
  "view documents",
  "manage documents",
  "view reports",
  "manage organization settings",
];

export const roles: RoleDefinition[] = [
  { name: "Owner/Admin", permissions: allPermissions },
  {
    name: "President",
    permissions: [
      "view roster",
      "edit roster",
      "view payments",
      "view recruitment/PNMs",
      "manage events",
      "manage guest lists",
      "view incident reports",
      "view photos",
      "approve photos for posting",
      "view standards cases",
      "view documents",
      "view reports",
      "manage organization settings",
    ],
  },
  {
    name: "Treasurer",
    permissions: [
      "view roster",
      "view payments",
      "manage payments",
      "manage events",
      "view documents",
      "view reports",
    ],
  },
  {
    name: "Recruitment Chair",
    permissions: [
      "view roster",
      "view recruitment/PNMs",
      "manage recruitment/PNMs",
      "send mass texts",
      "manage events",
      "view photos",
      "view reports",
    ],
  },
  {
    name: "Social Chair",
    permissions: [
      "view roster",
      "manage events",
      "manage guest lists",
      "view photos",
      "approve photos for posting",
      "view reports",
    ],
  },
  {
    name: "Risk Manager",
    permissions: [
      "view roster",
      "manage events",
      "view incident reports",
      "manage incident reports",
      "view documents",
      "view reports",
    ],
  },
  {
    name: "Captain",
    permissions: [
      "view roster",
      "edit roster",
      "view payments",
      "manage events",
      "manage guest lists",
      "view documents",
      "view reports",
    ],
  },
  {
    name: "Travel Coordinator",
    permissions: [
      "view roster",
      "view payments",
      "manage payments",
      "manage events",
      "view documents",
      "manage documents",
      "view reports",
    ],
  },
  {
    name: "Advisor",
    permissions: [
      "view roster",
      "view payments",
      "view incident reports",
      "view standards cases",
      "view documents",
      "view reports",
    ],
  },
  { name: "General Member", permissions: ["view roster", "view photos", "view documents"] },
  {
    name: "Campus Recreation Admin",
    permissions: [
      "view roster",
      "view reports",
      "view documents",
      "view incident reports",
    ],
  },
  { name: "Vice President", permissions: ["view roster", "edit roster", "manage events", "view reports"] },
  { name: "Secretary", permissions: ["view roster", "edit roster", "view documents", "manage documents"] },
  { name: "Philanthropy Chair", permissions: ["view roster", "manage events", "view payments", "view reports"] },
  { name: "Coach", permissions: ["view roster", "edit roster", "manage events", "view reports"] },
];

export const organizations: Organization[] = [
  {
    id: "org-alpha",
    name: "Alpha Beta Chapter",
    type: "Fraternity",
    campus: "Northlake University",
    councilOrLeague: "IFC",
    color: "#5b6cff",
    logo: "AB",
    contactEmail: "exec@alphabeta.edu",
    privacy: "private",
    officers: ["Maya Chen", "Jordan Ellis", "Sam Patel"],
  },
  {
    id: "org-zeta",
    name: "Zeta Lambda Sorority",
    type: "Sorority",
    campus: "Northlake University",
    councilOrLeague: "Panhellenic",
    color: "#ef5da8",
    logo: "ZL",
    contactEmail: "president@zetalambda.edu",
    privacy: "private",
    officers: ["Avery Brooks", "Nia Johnson", "Grace Lee"],
  },
  {
    id: "org-rugby",
    name: "Northlake Club Rugby",
    type: "Club Sports Team",
    campus: "Northlake University",
    councilOrLeague: "Campus Recreation",
    color: "#00a676",
    logo: "NR",
    contactEmail: "captains@northlakerugby.edu",
    privacy: "public",
    officers: ["Eli Morgan", "Taylor Smith", "Chris Rivera"],
  },
];

export const members: Member[] = [
  {
    id: "mem-1",
    organizationId: "org-alpha",
    fullName: "Jordan Ellis",
    preferredName: "Jordan",
    email: "jordan@alphabeta.edu",
    phone: "(555) 010-1122",
    classYear: "Junior",
    graduationYear: 2027,
    major: "Finance",
    hometown: "Austin, TX",
    status: "active",
    role: "President",
    committees: ["Exec", "Risk"],
    paymentStatus: "paid",
    attendanceRate: 94,
    formsComplete: 5,
    formsRequired: 5,
  },
  {
    id: "mem-2",
    organizationId: "org-alpha",
    fullName: "Sam Patel",
    preferredName: "Sam",
    email: "sam@alphabeta.edu",
    phone: "(555) 010-3344",
    classYear: "Sophomore",
    graduationYear: 2028,
    major: "Computer Science",
    hometown: "Raleigh, NC",
    status: "active",
    role: "Treasurer",
    committees: ["Finance"],
    paymentStatus: "partial",
    attendanceRate: 87,
    formsComplete: 4,
    formsRequired: 5,
    notes: "Payment plan approved through treasurer workflow.",
  },
  {
    id: "mem-3",
    organizationId: "org-alpha",
    fullName: "Leo Thompson",
    preferredName: "Leo",
    email: "leo@alphabeta.edu",
    phone: "(555) 010-7788",
    classYear: "Freshman",
    graduationYear: 2029,
    major: "Biology",
    hometown: "Boulder, CO",
    status: "new member",
    role: "General Member",
    committees: ["Philanthropy"],
    paymentStatus: "overdue",
    attendanceRate: 72,
    formsComplete: 3,
    formsRequired: 5,
  },
  {
    id: "mem-4",
    organizationId: "org-zeta",
    fullName: "Avery Brooks",
    preferredName: "Avery",
    email: "avery@zetalambda.edu",
    phone: "(555) 020-1010",
    classYear: "Senior",
    graduationYear: 2026,
    major: "Public Relations",
    hometown: "Chicago, IL",
    status: "active",
    role: "President",
    committees: ["Exec", "Standards"],
    paymentStatus: "paid",
    attendanceRate: 96,
    formsComplete: 6,
    formsRequired: 6,
  },
  {
    id: "mem-5",
    organizationId: "org-zeta",
    fullName: "Grace Lee",
    preferredName: "Grace",
    email: "grace@zetalambda.edu",
    phone: "(555) 020-2323",
    classYear: "Junior",
    graduationYear: 2027,
    major: "Marketing",
    hometown: "Seattle, WA",
    status: "active",
    role: "Social Chair",
    committees: ["PR", "Recruitment"],
    paymentStatus: "pending",
    attendanceRate: 91,
    formsComplete: 5,
    formsRequired: 6,
  },
  {
    id: "mem-6",
    organizationId: "org-rugby",
    fullName: "Eli Morgan",
    preferredName: "Eli",
    email: "eli@northlakerugby.edu",
    phone: "(555) 030-4545",
    classYear: "Senior",
    graduationYear: 2026,
    major: "Kinesiology",
    hometown: "Denver, CO",
    status: "active",
    role: "Captain",
    committees: ["Travel", "Tryouts"],
    paymentStatus: "paid",
    attendanceRate: 98,
    formsComplete: 7,
    formsRequired: 7,
  },
  {
    id: "mem-7",
    organizationId: "org-rugby",
    fullName: "Chris Rivera",
    preferredName: "Chris",
    email: "chris@northlakerugby.edu",
    phone: "(555) 030-9090",
    classYear: "Sophomore",
    graduationYear: 2028,
    major: "Engineering",
    hometown: "Phoenix, AZ",
    status: "injured",
    role: "General Member",
    committees: ["Equipment"],
    paymentStatus: "overdue",
    attendanceRate: 81,
    formsComplete: 6,
    formsRequired: 7,
  },
];

export const events: Event[] = [
  {
    id: "evt-1",
    organizationId: "org-alpha",
    title: "Spring Philanthropy Dinner",
    type: "philanthropy event",
    date: "2026-06-06T18:30:00",
    location: "Chapter House Courtyard",
    rsvpCount: 118,
    capacity: 160,
    checkedIn: 0,
    budget: 4200,
    requiresForms: true,
    riskLevel: "medium",
  },
  {
    id: "evt-2",
    organizationId: "org-alpha",
    title: "Recruitment Open House",
    type: "recruitment event",
    date: "2026-06-10T19:00:00",
    location: "Student Union Ballroom",
    rsvpCount: 64,
    capacity: 120,
    checkedIn: 0,
    budget: 950,
    requiresForms: false,
    riskLevel: "low",
  },
  {
    id: "evt-3",
    organizationId: "org-zeta",
    title: "Sisterhood Picnic",
    type: "mixer",
    date: "2026-06-08T12:00:00",
    location: "Lake Quad",
    rsvpCount: 82,
    capacity: 100,
    checkedIn: 0,
    budget: 1250,
    requiresForms: false,
    riskLevel: "low",
  },
  {
    id: "evt-4",
    organizationId: "org-rugby",
    title: "Regional Sevens Tournament",
    type: "tournament",
    date: "2026-06-14T08:00:00",
    location: "Metro Sports Complex",
    rsvpCount: 31,
    capacity: 34,
    checkedIn: 0,
    budget: 8700,
    requiresForms: true,
    riskLevel: "high",
  },
  {
    id: "evt-5",
    organizationId: "org-rugby",
    title: "Tuesday Conditioning",
    type: "practice",
    date: "2026-06-03T17:30:00",
    location: "South Field",
    rsvpCount: 24,
    capacity: 40,
    checkedIn: 0,
    budget: 0,
    requiresForms: true,
    riskLevel: "medium",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-1",
    organizationId: "org-alpha",
    memberId: "mem-1",
    category: "chapter dues",
    label: "Spring chapter dues",
    amount: 650,
    dueDate: "2026-06-01",
    status: "paid",
    paidAmount: 650,
  },
  {
    id: "pay-2",
    organizationId: "org-alpha",
    memberId: "mem-2",
    category: "social fees",
    label: "Formal social fee",
    amount: 180,
    dueDate: "2026-06-05",
    status: "partial",
    paidAmount: 75,
  },
  {
    id: "pay-3",
    organizationId: "org-alpha",
    memberId: "mem-3",
    category: "national dues",
    label: "New member national dues",
    amount: 375,
    dueDate: "2026-05-28",
    status: "overdue",
    paidAmount: 0,
  },
  {
    id: "pay-4",
    organizationId: "org-rugby",
    memberId: "mem-7",
    category: "travel deposits",
    label: "Regional tournament travel deposit",
    amount: 240,
    dueDate: "2026-06-04",
    status: "overdue",
    paidAmount: 40,
  },
  {
    id: "pay-5",
    organizationId: "org-rugby",
    memberId: "mem-6",
    category: "team dues",
    label: "Summer team dues",
    amount: 320,
    dueDate: "2026-06-07",
    status: "paid",
    paidAmount: 320,
  },
];

export const pnmLeads: PnmLead[] = [
  {
    id: "pnm-1",
    organizationId: "org-alpha",
    name: "Noah Williams",
    phone: "(555) 040-1111",
    email: "noah@example.edu",
    instagram: "@noahw",
    status: "attended",
    source: "Recruitment link-in-bio",
    consent: {
      optedIn: true,
      timestamp: "2026-05-29T18:42:00",
      source: "Interest form checkbox",
    },
    relationshipOwner: "Jordan Ellis",
    evaluation: {
      character: 5,
      involvement: 4,
      leadership: 4,
      mutualInterest: 5,
      riskConcern: "none",
    },
  },
  {
    id: "pnm-2",
    organizationId: "org-alpha",
    name: "Mateo Garcia",
    phone: "(555) 040-2222",
    email: "mateo@example.edu",
    status: "contacted",
    source: "Active member referral",
    consent: {
      optedIn: true,
      timestamp: "2026-05-30T14:10:00",
      source: "Referral form",
    },
    relationshipOwner: "Sam Patel",
    evaluation: {
      character: 4,
      involvement: 5,
      leadership: 3,
      mutualInterest: 4,
      riskConcern: "watch",
    },
  },
  {
    id: "pnm-3",
    organizationId: "org-zeta",
    name: "Lena Carter",
    phone: "(555) 050-3333",
    email: "lena@example.edu",
    instagram: "@lenac",
    status: "high priority",
    source: "Story tracking link",
    consent: {
      optedIn: true,
      timestamp: "2026-05-30T16:20:00",
      source: "COB interest form",
    },
    relationshipOwner: "Grace Lee",
    evaluation: {
      character: 5,
      involvement: 5,
      leadership: 5,
      mutualInterest: 4,
      riskConcern: "none",
    },
  },
];

export const socialAssets: SocialAsset[] = [
  {
    id: "soc-1",
    organizationId: "org-alpha",
    eventTitle: "Spring Philanthropy Dinner",
    photos: 184,
    approved: 38,
    needsReview: 17,
    captionDraft:
      "A night of service, community, and gratitude. Thank you to everyone who helped us support our philanthropy partner.",
    compliance: ["Consent check", "Co-host approval", "Sponsor tags"],
  },
  {
    id: "soc-2",
    organizationId: "org-zeta",
    eventTitle: "Sisterhood Picnic",
    photos: 96,
    approved: 24,
    needsReview: 8,
    captionDraft:
      "Sunshine, sisterhood, and the best campus picnic crew. More memories from Lake Quad.",
    compliance: ["Alcohol visibility", "Caption reviewed", "Member consent"],
  },
];

export const sportsReadiness: SportsReadiness[] = [
  {
    organizationId: "org-rugby",
    activePlayers: 28,
    injuredPlayers: 2,
    waiverCompletion: 86,
    travelReadiness: 74,
    equipmentReturned: 91,
    unpaidTravelFees: 640,
  },
];

export const auditLogs: AuditLogEntry[] = [
  {
    id: "audit-1",
    organizationId: "org-alpha",
    actor: "Sam Patel",
    action: "Created payment plan",
    target: "Leo Thompson",
    timestamp: "2026-05-30T15:44:00",
  },
  {
    id: "audit-2",
    organizationId: "org-alpha",
    actor: "Jordan Ellis",
    action: "Approved event risk checklist",
    target: "Spring Philanthropy Dinner",
    timestamp: "2026-05-30T16:02:00",
  },
  {
    id: "audit-3",
    organizationId: "org-rugby",
    actor: "Eli Morgan",
    action: "Updated travel roster",
    target: "Regional Sevens Tournament",
    timestamp: "2026-05-30T17:15:00",
  },
];

export const modules: FeatureModule[] = [
  {
    id: "roster",
    label: "Roster",
    summary: "Search members, filter statuses, track forms, dues, and attendance.",
    icon: Users,
    mvp: true,
    permissions: ["view roster"],
  },
  {
    id: "events",
    label: "Events",
    summary: "RSVPs, waitlists, QR check-in readiness, guest lists, and budgets.",
    icon: CalendarDays,
    mvp: true,
    permissions: ["manage events"],
  },
  {
    id: "payments",
    label: "Dues",
    summary: "Invoices, payment statuses, reminders, exports, and Stripe path.",
    icon: BadgeDollarSign,
    mvp: true,
    permissions: ["view payments"],
  },
  {
    id: "pnm",
    label: "PNM CRM",
    summary: "Consent-based recruitment pipeline, relationship owners, and voting.",
    icon: Megaphone,
    mvp: true,
    permissions: ["view recruitment/PNMs"],
  },
  {
    id: "social",
    label: "Touse Social",
    summary: "Photo approvals, content packs, compliance, and event recaps.",
    icon: Images,
    mvp: true,
    permissions: ["view photos"],
  },
  {
    id: "sports",
    label: "SportsOS",
    summary: "Roster eligibility, attendance, waivers, travel, injuries, and equipment.",
    icon: Trophy,
    mvp: true,
    permissions: ["view roster"],
  },
  {
    id: "forms",
    label: "Forms",
    summary: "Reusable forms, signatures, reminders, exports, and compliance reports.",
    icon: ClipboardCheck,
    mvp: true,
    permissions: ["view documents"],
  },
  {
    id: "risk",
    label: "Risk & audit",
    summary: "Incident reports, standards cases, risk checks, and audit history.",
    icon: ShieldCheck,
    mvp: false,
    permissions: ["view incident reports"],
  },
];

export const mvpPriority = [
  "Auth and organizations",
  "Roles and permissions",
  "Member roster",
  "Events and RSVP",
  "Photo albums",
  "PNM CRM",
  "Consent-based PNM texting",
  "Basic dues/payment tracking",
  "Stripe Checkout",
  "Social media approval/content pack",
  "Interchapter event proposals",
  "Officer transition notes",
  "SportsOS roster",
  "SportsOS attendance",
  "SportsOS waivers",
  "SportsOS travel cost calculator",
  "Reports",
  "Advanced AI",
];

export function getRole(roleName: RoleName): RoleDefinition {
  return roles.find((role) => role.name === roleName) ?? roles[0];
}

export function can(roleName: RoleName, permission: Permission): boolean {
  return getRole(roleName).permissions.includes(permission);
}

export function getOrganizationData(organizationId: string) {
  const organization = organizations.find((org) => org.id === organizationId) ?? organizations[0];
  const orgMembers = members.filter((member) => member.organizationId === organization.id);
  const orgEvents = events.filter((event) => event.organizationId === organization.id);
  const orgPayments = payments.filter((payment) => payment.organizationId === organization.id);
  const orgPnms = pnmLeads.filter((pnm) => pnm.organizationId === organization.id);
  const orgSocial = socialAssets.filter((asset) => asset.organizationId === organization.id);
  const orgAudits = auditLogs.filter((log) => log.organizationId === organization.id);
  const sports = sportsReadiness.find((item) => item.organizationId === organization.id);

  return {
    organization,
    members: orgMembers,
    events: orgEvents,
    payments: orgPayments,
    pnms: orgPnms,
    socialAssets: orgSocial,
    auditLogs: orgAudits,
    sports,
  };
}
