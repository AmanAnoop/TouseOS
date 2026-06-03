export type EligibilityIssue =
  | "injured"
  | "inactive"
  | "dues_overdue"
  | "waivers_incomplete"
  | "low_attendance"
  | "travel_waiver_missing";

export interface MemberEligibilityInput {
  membershipStatus: string;
  paymentStatus: string;
  attendanceRate: number;
  isInjured?: boolean;
  completedWaiverTypes?: string[];
  requiredWaiverTypes?: string[];
}

const DEFAULT_REQUIRED_WAIVERS: string[] = [
  "liability",
  "emergency_contact",
  "travel_authorization",
];

export function assessMemberEligibility(
  input: MemberEligibilityInput,
  opts?: { minAttendancePercent?: number; requireTravelWaiver?: boolean },
): { eligible: boolean; issues: EligibilityIssue[] } {
  const minAttendance = opts?.minAttendancePercent ?? 70;
  const required: string[] = input.requiredWaiverTypes
    ? [...input.requiredWaiverTypes]
    : [...DEFAULT_REQUIRED_WAIVERS];
  const issues: EligibilityIssue[] = [];

  if (input.isInjured) issues.push("injured");
  if (["inactive", "suspended", "alumni", "removed"].includes(input.membershipStatus)) {
    issues.push("inactive");
  } else if (input.membershipStatus !== "active") {
    // practice squad / injured list may still travel at coach discretion — only block clear inactive states above
  }
  if (input.paymentStatus === "overdue") issues.push("dues_overdue");
  if (input.attendanceRate < minAttendance) issues.push("low_attendance");

  const completed = new Set(input.completedWaiverTypes ?? []);
  const missingRequired = required.filter((w) => !completed.has(w));
  if (missingRequired.length > 0) issues.push("waivers_incomplete");
  if (opts?.requireTravelWaiver && !completed.has("travel_authorization")) {
    issues.push("travel_waiver_missing");
  }

  return { eligible: issues.length === 0, issues };
}

export function eligibilityIssueLabel(issue: EligibilityIssue): string {
  const map: Record<EligibilityIssue, string> = {
    injured: "On injury list",
    inactive: "Not active on roster",
    dues_overdue: "Dues overdue",
    waivers_incomplete: "Waivers incomplete",
    low_attendance: "Below attendance minimum",
    travel_waiver_missing: "Travel waiver missing",
  };
  return map[issue];
}
