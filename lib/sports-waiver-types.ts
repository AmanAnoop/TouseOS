/** Shared SportsOS waiver types — maps forms.type ↔ sports_waivers.waiver_type */
export const SPORTS_WAIVER_TYPES = [
  { key: "liability", label: "Liability waiver", required: true },
  { key: "concussion", label: "Concussion form", required: true },
  { key: "emergency_contact", label: "Emergency contact form", required: true },
  { key: "medical", label: "Medical information form", required: true },
  { key: "travel_authorization", label: "Travel authorization", required: false },
  { key: "driver_form", label: "Driver form", required: false },
  { key: "code_of_conduct", label: "Code of conduct", required: true },
  { key: "league_eligibility", label: "League eligibility form", required: true },
  { key: "university_recreation", label: "University recreation form", required: true },
] as const;

export type SportsWaiverTypeKey = (typeof SPORTS_WAIVER_TYPES)[number]["key"];

export const REQUIRED_SPORTS_WAIVER_KEYS = SPORTS_WAIVER_TYPES.filter((t) => t.required).map((t) => t.key);

export function isSportsWaiverType(type: string): type is SportsWaiverTypeKey {
  return SPORTS_WAIVER_TYPES.some((t) => t.key === type);
}

export function waiverTypeLabel(key: string): string {
  return SPORTS_WAIVER_TYPES.find((t) => t.key === key)?.label ?? key;
}
