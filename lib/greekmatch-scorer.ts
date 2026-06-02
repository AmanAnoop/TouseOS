export interface GreekMatchProfile {
  user_id: string;
  interests: string[];
  major: string | null;
  graduation_year: number | null;
  gender: string | null;
}

function normalizeInterest(s: string): string {
  return s.trim().toLowerCase();
}

/** Score 0–100 for how well two GreekMatch profiles align. */
export function scoreGreekMatch(
  viewer: GreekMatchProfile,
  candidate: GreekMatchProfile,
): { score: number; sharedInterests: string[] } {
  const viewerInterests = (viewer.interests ?? []).map(normalizeInterest).filter(Boolean);
  const candidateInterests = (candidate.interests ?? []).map(normalizeInterest).filter(Boolean);

  const shared = viewerInterests.filter((i) => candidateInterests.includes(i));
  const union = new Set([...viewerInterests, ...candidateInterests]);
  const interestScore = union.size > 0 ? (shared.length / union.size) * 55 : 0;

  let majorScore = 0;
  if (viewer.major && candidate.major) {
    const a = viewer.major.trim().toLowerCase();
    const b = candidate.major.trim().toLowerCase();
    if (a === b) majorScore = 20;
    else if (a.split(/\s+/)[0] === b.split(/\s+/)[0]) majorScore = 10;
  }

  let yearScore = 0;
  if (viewer.graduation_year && candidate.graduation_year) {
    const diff = Math.abs(viewer.graduation_year - candidate.graduation_year);
    if (diff === 0) yearScore = 15;
    else if (diff <= 1) yearScore = 10;
    else if (diff <= 2) yearScore = 5;
  }

  let genderScore = 0;
  if (viewer.gender && candidate.gender && viewer.gender === candidate.gender) {
    genderScore = 10;
  }

  const raw = interestScore + majorScore + yearScore + genderScore;
  return {
    score: Math.min(100, Math.round(raw)),
    sharedInterests: shared,
  };
}

export function rankGreekMatchCandidates<T extends GreekMatchProfile>(
  viewer: GreekMatchProfile,
  candidates: T[],
): Array<T & { matchScore: number; sharedInterests: string[] }> {
  return candidates
    .map((c) => {
      const { score, sharedInterests } = scoreGreekMatch(viewer, c);
      return { ...c, matchScore: score, sharedInterests };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
