import { eventTypesForOrgType } from "@/lib/org-product";

export interface EventTemplate {
  id: string;
  eventType: string;
  label: string;
  title: string;
  description: string;
  budgetAmount: number;
  /** Suggested ticket / member cost (USD) */
  pricePerPerson?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  dresscode?: string;
  theme?: string;
  rsvpEnabled: boolean;
}

const GREEK_EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "greek-formal",
    eventType: "formal",
    label: "Formal",
    title: "Spring Formal",
    description: "Semi-formal dinner and dance for chapter members and guests.",
    budgetAmount: 5000,
    pricePerPerson: 75,
    riskLevel: "medium",
    dresscode: "Cocktail attire",
    theme: "Black tie optional",
    rsvpEnabled: true,
  },
  {
    id: "greek-mixer",
    eventType: "mixer",
    label: "Mixer",
    title: "Social Mixer",
    description: "Joint social with a partner organization — food, music, and mingling.",
    budgetAmount: 800,
    pricePerPerson: 15,
    riskLevel: "medium",
    dresscode: "Casual",
    rsvpEnabled: true,
  },
  {
    id: "greek-date-party",
    eventType: "date_party",
    label: "Date party",
    title: "Date Party",
    description: "Themed party for members and their dates.",
    budgetAmount: 1200,
    pricePerPerson: 20,
    riskLevel: "high",
    dresscode: "Theme costume",
    theme: "Decades night",
    rsvpEnabled: true,
  },
  {
    id: "greek-philanthropy",
    eventType: "philanthropy",
    label: "Philanthropy",
    title: "Philanthropy Week",
    description: "Fundraising and awareness events for our national philanthropy.",
    budgetAmount: 600,
    pricePerPerson: 0,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "greek-brotherhood",
    eventType: "brotherhood",
    label: "Brotherhood",
    title: "Brotherhood Retreat",
    description: "Bonding activities and leadership development for active members.",
    budgetAmount: 400,
    pricePerPerson: 25,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "greek-sisterhood",
    eventType: "sisterhood",
    label: "Sisterhood",
    title: "Sisterhood Night",
    description: "Chapter bonding night with activities and dinner.",
    budgetAmount: 350,
    pricePerPerson: 20,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "greek-tailgate",
    eventType: "tailgate",
    label: "Tailgate",
    title: "Game Day Tailgate",
    description: "Pre-game cookout and chapter hangout.",
    budgetAmount: 500,
    pricePerPerson: 10,
    riskLevel: "medium",
    dresscode: "Team colors",
    rsvpEnabled: true,
  },
  {
    id: "greek-chapter-meeting",
    eventType: "chapter_meeting",
    label: "Chapter meeting",
    title: "Weekly Chapter Meeting",
    description: "Business, announcements, and chapter updates.",
    budgetAmount: 50,
    riskLevel: "low",
    rsvpEnabled: false,
  },
  {
    id: "greek-recruitment",
    eventType: "recruitment",
    label: "Recruitment",
    title: "Open House",
    description: "Meet potential new members and showcase chapter culture.",
    budgetAmount: 300,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "greek-retreat",
    eventType: "retreat",
    label: "Retreat",
    title: "Chapter Retreat",
    description: "Weekend leadership and bonding retreat off campus.",
    budgetAmount: 3500,
    pricePerPerson: 120,
    riskLevel: "medium",
    rsvpEnabled: true,
  },
];

const SPORTS_EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "sports-game",
    eventType: "game",
    label: "Game",
    title: "Home Game",
    description: "Match day — arrive early for warm-ups and team meeting.",
    budgetAmount: 200,
    pricePerPerson: 0,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "sports-tournament",
    eventType: "tournament",
    label: "Tournament",
    title: "Regional Tournament",
    description: "Multi-day tournament with travel and lodging.",
    budgetAmount: 4500,
    pricePerPerson: 150,
    riskLevel: "medium",
    rsvpEnabled: true,
  },
  {
    id: "sports-tryout",
    eventType: "tryout",
    label: "Tryout",
    title: "Tryout Session",
    description: "Open tryouts for prospective players.",
    budgetAmount: 100,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "sports-fundraiser",
    eventType: "fundraiser",
    label: "Fundraiser",
    title: "Team Fundraiser",
    description: "Raise funds for equipment, travel, and league fees.",
    budgetAmount: 250,
    pricePerPerson: 15,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "sports-travel",
    eventType: "travel",
    label: "Travel event",
    title: "Away Trip",
    description: "Travel event tied to an away game or tournament.",
    budgetAmount: 3000,
    pricePerPerson: 125,
    riskLevel: "medium",
    rsvpEnabled: true,
  },
  {
    id: "sports-team-meeting",
    eventType: "team_meeting",
    label: "Team meeting",
    title: "Team Meeting",
    description: "Logistics, film review, and announcements.",
    budgetAmount: 0,
    riskLevel: "low",
    rsvpEnabled: false,
  },
];

const CLUB_EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "club-meeting",
    eventType: "general_meeting",
    label: "General meeting",
    title: "General Meeting",
    description: "Updates, planning, and member announcements.",
    budgetAmount: 50,
    riskLevel: "low",
    rsvpEnabled: false,
  },
  {
    id: "club-fundraiser",
    eventType: "fundraiser",
    label: "Fundraiser",
    title: "Club Fundraiser",
    description: "Raise money for programs and events.",
    budgetAmount: 200,
    pricePerPerson: 10,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "club-social",
    eventType: "social",
    label: "Social",
    title: "Member Social",
    description: "Casual hangout for members and guests.",
    budgetAmount: 300,
    pricePerPerson: 12,
    riskLevel: "low",
    dresscode: "Casual",
    rsvpEnabled: true,
  },
  {
    id: "club-service",
    eventType: "service",
    label: "Service",
    title: "Community Service Day",
    description: "Volunteer project for the local community.",
    budgetAmount: 100,
    riskLevel: "low",
    rsvpEnabled: true,
  },
  {
    id: "club-retreat",
    eventType: "retreat",
    label: "Retreat",
    title: "Officer Retreat",
    description: "Planning retreat for leadership and committees.",
    budgetAmount: 800,
    pricePerPerson: 40,
    riskLevel: "low",
    rsvpEnabled: true,
  },
];

export function eventTemplatesForOrgType(orgType: string): EventTemplate[] {
  const allowed = new Set<string>(eventTypesForOrgType(orgType).map((t) => t.value));
  const pool =
    orgType === "club_sports"
      ? SPORTS_EVENT_TEMPLATES
      : orgType === "general_org"
        ? CLUB_EVENT_TEMPLATES
        : GREEK_EVENT_TEMPLATES;
  return pool.filter((t) => allowed.has(t.eventType));
}

export function getEventTemplateById(orgType: string, id: string): EventTemplate | undefined {
  return eventTemplatesForOrgType(orgType).find((t) => t.id === id);
}
