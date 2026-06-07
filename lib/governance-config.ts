/** Governance meeting types and vote defaults — user-facing labels per product spec. */

export const MEETING_TYPES = [
  { value: "chapter", label: "Chapter" },
  { value: "standards", label: "Standards" },
  { value: "exec", label: "Exec" },
  { value: "committee", label: "Committee" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "special", label: "Special" },
  { value: "other", label: "Other" },
] as const;

export const EXPECTED_ATTENDEE_GROUPS = [
  { value: "all_members", label: "All Members" },
  { value: "exec_board", label: "Exec Board" },
  { value: "new_members", label: "New Members" },
  { value: "specific", label: "Specific Members" },
] as const;

export const DEFAULT_VOTE_OPTIONS = ["Yes", "No", "Abstain"];

export function meetingTypeLabel(value: string): string {
  return MEETING_TYPES.find((t) => t.value === value)?.label
    ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
