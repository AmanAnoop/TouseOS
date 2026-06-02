import type { RushMatchResult } from "@/lib/rush-matcher";

export interface RelationshipSuggestion {
  memberId: string;
  memberName: string;
  relationshipType: string;
  strength: number;
  reason: string;
  autoSuggested: boolean;
}

const RELATIONSHIP_TYPES = [
  "friend",
  "referral",
  "same_major",
  "same_hometown",
  "same_class",
  "family",
  "roommate",
  "alumni_referral",
  "other",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function isValidRelationshipType(t: string): t is RelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(t);
}

function nameParts(fullName: string): string[] {
  return fullName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
}

function textMentionsName(text: string | null, fullName: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return nameParts(fullName).some((p) => lower.includes(p));
}

export interface MemberForSuggestion {
  id: string;
  full_name: string;
  major: string | null;
  hometown: string | null;
  class_year: string | null;
}

export interface PnmForSuggestion {
  referral_source: string | null;
  active_member_connection: string | null;
  major: string | null;
  hometown: string | null;
  class_year: string | null;
}

export function suggestPnmRelationships(
  pnm: PnmForSuggestion,
  members: MemberForSuggestion[],
  rushMatches: RushMatchResult[] = [],
): RelationshipSuggestion[] {
  const suggestions: RelationshipSuggestion[] = [];
  const seen = new Set<string>();

  function add(
    member: MemberForSuggestion,
    relationshipType: RelationshipType,
    strength: number,
    reason: string,
  ) {
    if (seen.has(member.id)) return;
    seen.add(member.id);
    suggestions.push({
      memberId: member.id,
      memberName: member.full_name,
      relationshipType,
      strength,
      reason,
      autoSuggested: true,
    });
  }

  for (const m of members) {
    if (textMentionsName(pnm.referral_source, m.full_name)) {
      add(m, "referral", 5, "Named in referral source");
    }
    if (textMentionsName(pnm.active_member_connection, m.full_name)) {
      add(m, "friend", 5, "Listed as active member connection");
    }
    if (
      pnm.major && m.major &&
      pnm.major.toLowerCase().trim() === m.major.toLowerCase().trim()
    ) {
      add(m, "same_major", 3, `Same major (${m.major})`);
    }
    if (pnm.hometown && m.hometown) {
      const pParts = pnm.hometown.toLowerCase().split(/[,/]/).map((s) => s.trim());
      const mParts = m.hometown.toLowerCase().split(/[,/]/).map((s) => s.trim());
      if (pParts.some((p) => mParts.includes(p))) {
        add(m, "same_hometown", 3, "Shared hometown");
      }
    }
    if (
      pnm.class_year && m.class_year &&
      pnm.class_year === m.class_year
    ) {
      add(m, "same_class", 2, "Same class year");
    }
  }

  for (const match of rushMatches.slice(0, 3)) {
    if (seen.has(match.memberId)) continue;
    if (match.score < 40) continue;
    seen.add(match.memberId);
    suggestions.push({
      memberId: match.memberId,
      memberName: match.memberName,
      relationshipType: "friend",
      strength: match.score >= 70 ? 4 : 3,
      reason: `High interest overlap (${match.score}% match)`,
      autoSuggested: true,
    });
  }

  return suggestions.sort((a, b) => b.strength - a.strength);
}
