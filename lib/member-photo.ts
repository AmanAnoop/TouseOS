/** Resolve the best display URL for a member avatar. */
export function resolveMemberPhotoUrl(member: {
  profile_photo_url?: string | null;
  avatar_url?: string | null;
  profiles?: { avatar_url?: string | null } | null;
}): string | null {
  const fromProfile = member.profile_photo_url?.trim();
  if (fromProfile) return fromProfile;
  const fromJoin = member.profiles?.avatar_url?.trim();
  if (fromJoin) return fromJoin;
  const direct = member.avatar_url?.trim();
  return direct || null;
}

export function enrichMemberPhotos<T extends {
  profile_photo_url?: string | null;
  profiles?: { avatar_url?: string | null } | null;
}>(members: T[]): Array<T & { profile_photo_url: string | null }> {
  return members.map((m) => ({
    ...m,
    profile_photo_url: resolveMemberPhotoUrl(m),
  }));
}
