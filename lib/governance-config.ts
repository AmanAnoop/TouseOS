/** Governance meeting types and vote defaults. */

export const MEETING_TYPES = [
  { value: "chapter_meeting", label: "Chapter meeting" },
  { value: "executive_board", label: "Executive board" },
  { value: "standards_hearing", label: "Standards hearing" },
  { value: "officer_election", label: "Officer election" },
  { value: "committee", label: "Committee meeting" },
  { value: "special_session", label: "Special session" },
] as const;

export const DEFAULT_VOTE_OPTIONS = ["Yes", "No", "Abstain"];

export function meetingTypeLabel(value: string): string {
  return MEETING_TYPES.find((t) => t.value === value)?.label ?? value.replace(/_/g, " ");
}
