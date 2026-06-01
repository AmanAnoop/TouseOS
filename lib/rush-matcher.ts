export interface RushProfile {
  id: string;
  full_name: string;
  interests: string[];
  tags: string[];
  major: string | null;
  hometown: string | null;
  class_year: string | null;
  referral_source: string | null;
  active_member_connection: string | null;
  ai_interest_summary?: string | null;
}

export interface MemberRushProfile {
  id: string;
  full_name: string;
  interests: string[];
  major: string | null;
  hometown: string | null;
  class_year: string | null;
  role: string;
}

export interface RushMatchResult {
  memberId: string;
  memberName: string;
  score: number;
  sharedInterests: string[];
  matchReasons: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function tokenizeLocation(hometown: string | null): string[] {
  if (!hometown) return [];
  return hometown
    .toLowerCase()
    .split(/[,/]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  return [...new Set(a.map(normalize).filter((x) => x && setB.has(x)))];
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
}

function nameMentionedIn(text: string | null, fullName: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const parts = fullName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
  return parts.some((p) => lower.includes(p));
}

export function computeRushMatch(
  pnm: RushProfile,
  member: MemberRushProfile,
): RushMatchResult {
  const pnmInterests = [...pnm.interests, ...pnm.tags];
  const memberInterests = member.interests ?? [];
  const sharedInterests = overlap(pnmInterests, memberInterests);

  const interestScore = jaccard(pnmInterests, memberInterests) * 40;
  const tagBonus = overlap(pnm.tags, memberInterests).length > 0 ? 5 : 0;

  let majorScore = 0;
  if (pnm.major && member.major && normalize(pnm.major) === normalize(member.major)) {
    majorScore = 15;
  } else if (
    pnm.major && member.major &&
    (normalize(pnm.major).includes(normalize(member.major)) ||
      normalize(member.major).includes(normalize(pnm.major)))
  ) {
    majorScore = 8;
  }

  let hometownScore = 0;
  const pnmLoc = tokenizeLocation(pnm.hometown);
  const memLoc = tokenizeLocation(member.hometown);
  const locOverlap = overlap(pnmLoc, memLoc);
  if (locOverlap.length > 0) hometownScore = 15;

  let connectionScore = 0;
  const reasons: string[] = [];

  if (nameMentionedIn(pnm.referral_source, member.full_name)) {
    connectionScore += 12;
    reasons.push("Listed as referral source");
  }
  if (nameMentionedIn(pnm.active_member_connection, member.full_name)) {
    connectionScore += 12;
    reasons.push("Active member connection");
  }

  if (sharedInterests.length > 0) {
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 4).join(", ")}`);
  }
  if (majorScore >= 15) reasons.push("Same major");
  else if (majorScore > 0) reasons.push("Related major");
  if (hometownScore > 0) reasons.push(`Hometown overlap (${locOverlap[0]})`);

  if (
    pnm.class_year && member.class_year &&
    normalize(pnm.class_year) === normalize(member.class_year)
  ) {
    reasons.push("Same class year");
  }

  const raw =
    interestScore + tagBonus + majorScore + hometownScore + connectionScore;
  const score = Math.min(100, Math.round(raw));

  return {
    memberId: member.id,
    memberName: member.full_name,
    score,
    sharedInterests,
    matchReasons: reasons.slice(0, 5),
  };
}

export function rankRushMatches(
  pnm: RushProfile,
  members: MemberRushProfile[],
  limit = 15,
): RushMatchResult[] {
  return members
    .map((m) => computeRushMatch(pnm, m))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
