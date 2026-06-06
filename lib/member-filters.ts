import type { MemberProfile } from "@/types";

export function isPendingInvite(
  member: Pick<MemberProfile, "membership_status">,
): boolean {
  return member.membership_status === "pending_invite";
}

/** Members who have joined or are otherwise on the active roster (not invite-only). */
export function isRosterMember(
  member: Pick<MemberProfile, "membership_status">,
): boolean {
  return member.membership_status !== "pending_invite";
}

export function filterRosterMembers<T extends Pick<MemberProfile, "membership_status">>(
  members: T[],
): T[] {
  return members.filter(isRosterMember);
}

export function filterPendingInvites<T extends Pick<MemberProfile, "membership_status">>(
  members: T[],
): T[] {
  return members.filter(isPendingInvite);
}
