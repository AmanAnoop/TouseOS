export const PR_COMPLIANCE_ITEMS = [
  { id: "alcohol", label: "Alcohol visible in any photos?", mustClear: true },
  { id: "unsafe", label: "Unsafe behavior visible?", mustClear: true },
  { id: "nonmembers", label: "Non-members visible without consent?", mustClear: true },
  { id: "consent", label: "Photo consent confirmed for identifiable people?", mustClear: false },
  { id: "sponsor", label: "Sponsor tagged if applicable?", mustClear: false },
  { id: "philanthropy", label: "Philanthropy beneficiary tagged?", mustClear: false },
  { id: "cohost", label: "Co-host chapter approved?", mustClear: false },
  { id: "caption", label: "Caption reviewed by PR chair?", mustClear: false },
  { id: "guidelines", label: "National / chapter guidelines followed?", mustClear: false },
] as const;

export type PrChecklistState = Record<string, boolean>;

export function isPrComplianceCleared(checklist: PrChecklistState): boolean {
  return PR_COMPLIANCE_ITEMS.filter((i) => i.mustClear).every((i) => checklist[i.id] === true);
}
