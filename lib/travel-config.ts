/** Travel module configuration — Greek OS vs Sports OS parity with type-specific defaults. */

export type TravelProduct = "greek" | "sports";

export interface TripTypeOption {
  value: string;
  label: string;
}

export const GREEK_TRIP_TYPES: TripTypeOption[] = [
  { value: "formal", label: "Formal" },
  { value: "brotherhood_retreat", label: "Brotherhood Retreat" },
  { value: "sisterhood_retreat", label: "Sisterhood Retreat" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "conference", label: "Conference" },
  { value: "alumni_event", label: "Alumni Event" },
  { value: "other", label: "Other" },
];

export const SPORTS_TRIP_TYPES: TripTypeOption[] = [
  { value: "away_game", label: "Away Game" },
  { value: "tournament", label: "Tournament" },
  { value: "training_camp", label: "Training Camp" },
  { value: "team_retreat", label: "Team Retreat" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

export const BUDGET_CATEGORIES = [
  { value: "transportation", label: "Transportation" },
  { value: "accommodation", label: "Accommodation" },
  { value: "food", label: "Food" },
  { value: "activities", label: "Activities" },
  { value: "miscellaneous", label: "Miscellaneous" },
] as const;

export const TRIP_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export const RSVP_STATUSES = [
  { value: "attending", label: "Attending" },
  { value: "not_attending", label: "Not Attending" },
  { value: "no_response", label: "No Response" },
] as const;

const GREEK_CHECKLIST_STARTERS: Record<string, string[]> = {
  formal: [
    "Book venue",
    "Collect RSVPs",
    "Send dress code info",
    "Arrange transportation",
    "Collect payment",
  ],
  conference: [
    "Register attendees",
    "Book hotel block",
    "Share agenda",
    "Collect dietary restrictions",
  ],
  brotherhood_retreat: [
    "Book lodging",
    "Collect RSVPs",
    "Plan activities",
    "Arrange transportation",
    "Collect payment",
  ],
  sisterhood_retreat: [
    "Book lodging",
    "Collect RSVPs",
    "Plan activities",
    "Arrange transportation",
    "Collect payment",
  ],
  philanthropy: [
    "Confirm charity partner",
    "Collect RSVPs",
    "Arrange transportation",
    "Share volunteer schedule",
  ],
  alumni_event: [
    "Send invitations",
    "Book venue",
    "Collect RSVPs",
    "Prepare program",
  ],
  other: [
    "Collect RSVPs",
    "Arrange transportation",
    "Collect payment",
  ],
};

const SPORTS_CHECKLIST_STARTERS: Record<string, string[]> = {
  away_game: [
    "Book travel",
    "Confirm roster",
    "Pack uniforms",
    "Share departure time",
    "Collect waivers",
  ],
  tournament: [
    "Register team",
    "Book hotel block",
    "Confirm bracket/schedule",
    "Pack equipment",
    "Share itinerary with players",
  ],
  training_camp: [
    "Book facility",
    "Confirm roster",
    "Pack equipment",
    "Share schedule",
    "Collect waivers",
  ],
  team_retreat: [
    "Book lodging",
    "Confirm roster",
    "Plan activities",
    "Share departure time",
  ],
  conference: [
    "Register attendees",
    "Book hotel block",
    "Share agenda",
    "Collect dietary restrictions",
  ],
  other: [
    "Confirm roster",
    "Book travel",
    "Share itinerary",
  ],
};

export function tripTypesForProduct(product: TravelProduct): TripTypeOption[] {
  return product === "greek" ? GREEK_TRIP_TYPES : SPORTS_TRIP_TYPES;
}

export function starterChecklist(product: TravelProduct, tripType: string): string[] {
  const map = product === "greek" ? GREEK_CHECKLIST_STARTERS : SPORTS_CHECKLIST_STARTERS;
  return map[tripType] ?? map.other ?? [];
}

export function travelProductFromOrgType(orgType: string): TravelProduct {
  return orgType === "club_sports" ? "sports" : "greek";
}
