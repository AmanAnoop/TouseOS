import type { MemberStatus } from "@/types";

/** Members who appear in assignee dropdowns, housing, standards, etc. */
const SELECTABLE_STATUSES: MemberStatus[] = ["active", "new_member"];

export function isActiveMember(
  member: { membership_status: string },
): boolean {
  return SELECTABLE_STATUSES.includes(member.membership_status as MemberStatus);
}

export function filterActiveMembers<T extends { membership_status: string }>(
  members: T[],
): T[] {
  return members.filter(isActiveMember);
}

export function isPendingInvite(
  member: { membership_status: string },
): boolean {
  return member.membership_status === "pending_invite";
}

/** Members who have joined or are otherwise on the active roster (not invite-only). */
export function isRosterMember(
  member: { membership_status: string },
): boolean {
  return member.membership_status !== "pending_invite";
}

export function filterRosterMembers<T extends { membership_status: string }>(
  members: T[],
): T[] {
  return members.filter(isRosterMember);
}

export function filterPendingInvites<T extends { membership_status: string }>(
  members: T[],
): T[] {
  return members.filter(isPendingInvite);
}
