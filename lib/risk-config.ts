/** Risk management checklist config and sober monitor calculations. */

export interface RiskChecklistItem {
  key: string;
  label: string;
  description: string;
  risk: number;
}

export const RISK_CHECKLIST_ITEMS: RiskChecklistItem[] = [
  {
    key: "alcohol_policy",
    label: "Alcohol policy checklist completed",
    description: "Verify BYOB limits, third-party vendor rules, and chapter alcohol policy sign-off.",
    risk: 20,
  },
  {
    key: "sober_monitors_assigned",
    label: "Sober monitors assigned",
    description: "Assign trained sober monitors per guest ratio requirements.",
    risk: 15,
  },
  {
    key: "guest_ratio_checked",
    label: "Guest ratio within limits",
    description: "Confirm guest list count vs. member attendance meets policy.",
    risk: 10,
  },
  {
    key: "venue_contract_uploaded",
    label: "Venue contract uploaded",
    description: "Signed venue agreement on file with insurance rider if required.",
    risk: 10,
  },
  {
    key: "transportation_plan",
    label: "Transportation plan in place",
    description: "Designated drivers, rideshare codes, or shuttle plan documented.",
    risk: 15,
  },
  {
    key: "security_plan",
    label: "Security/door plan confirmed",
    description: "ID check, guest list, and door team assignments confirmed.",
    risk: 15,
  },
  {
    key: "emergency_plan",
    label: "Emergency action plan ready",
    description: "Emergency contacts, nearest hospital, and evacuation plan shared with officers.",
    risk: 10,
  },
  {
    key: "food_water_plan",
    label: "Food and water available",
    description: "Non-alcoholic beverages and food available throughout the event.",
    risk: 5,
  },
];

/** Guests per sober monitor (config table value). */
export const SOBER_MONITOR_GUEST_RATIO = 25;

/** Minimum sober monitors regardless of attendance. */
export const SOBER_MONITOR_MINIMUM = 2;

export function requiredSoberMonitors(expectedAttendees: number): number {
  const count = Math.max(0, expectedAttendees);
  return Math.max(SOBER_MONITOR_MINIMUM, Math.ceil(count / SOBER_MONITOR_GUEST_RATIO));
}

export function computeRiskScore(items: Record<string, boolean>): number {
  const totalWeight = RISK_CHECKLIST_ITEMS.reduce((s, i) => s + i.risk, 0);
  const earned = RISK_CHECKLIST_ITEMS.filter((i) => items[i.key]).reduce((s, i) => s + i.risk, 0);
  return Math.round((earned / totalWeight) * 100);
}

export function riskLabel(score: number): { label: string; color: "green" | "yellow" | "red" } {
  if (score >= 80) return { label: "Low risk", color: "green" };
  if (score >= 60) return { label: "Medium risk", color: "yellow" };
  return { label: "High risk", color: "red" };
}

export interface RiskChecklistMetadata {
  expected_attendees?: number;
  sober_monitor_ids?: string[];
}
