import { claudeComplete, isAnthropicConfigured } from "@/lib/anthropic";

export interface ExtractedProfile {
  interests: string[];
  traits: string[];
  summary: string;
}

const FALLBACK: ExtractedProfile = {
  interests: [],
  traits: [],
  summary: "",
};

const EXTRACT_SYSTEM = `You extract structured interest tags from social media bios for fraternity/sorority rush matching.
Return JSON only: { "interests": string[], "traits": string[], "summary": string }
Rules:
- interests: lowercase short tags (e.g. "basketball", "finance", "photography") max 15 items
- traits: personality/social tags max 5 (e.g. "outgoing", "community-minded")
- summary: one sentence for recruitment chairs, no sensitive judgments
- Do not infer race, religion, sexuality, or medical info
- Only use information explicitly in the bio text`;

export async function extractInterestsFromBio(
  bioText: string,
  context?: { fullName?: string; major?: string; hometown?: string },
): Promise<ExtractedProfile> {
  const trimmed = bioText.trim();
  if (!trimmed) return FALLBACK;

  if (!isAnthropicConfigured()) {
    return extractInterestsHeuristic(trimmed, context);
  }

  const raw = await claudeComplete({
    system: EXTRACT_SYSTEM,
    maxTokens: 500,
    messages: [{
      role: "user",
      content: `Name: ${context?.fullName ?? "Unknown"}
Major: ${context?.major ?? "—"}
Hometown: ${context?.hometown ?? "—"}

Bio text:
${trimmed.slice(0, 4000)}`,
    }],
  });

  if (!raw) return extractInterestsHeuristic(trimmed, context);

  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const json = jsonStart >= 0 && jsonEnd > jsonStart ? raw.slice(jsonStart, jsonEnd + 1) : raw;
    const parsed = JSON.parse(json) as Partial<ExtractedProfile>;
    return {
      interests: normalizeTags(parsed.interests ?? []),
      traits: normalizeTags(parsed.traits ?? []),
      summary: String(parsed.summary ?? "").slice(0, 500),
    };
  } catch {
    return extractInterestsHeuristic(trimmed, context);
  }
}

function normalizeTags(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const tag = item.toLowerCase().trim().replace(/\s+/g, " ");
    if (!tag || tag.length > 40 || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out.slice(0, 20);
}

/** Keyword fallback when Claude is unavailable */
export function extractInterestsHeuristic(
  bioText: string,
  context?: { fullName?: string; major?: string; hometown?: string },
): ExtractedProfile {
  const lower = bioText.toLowerCase();
  const dictionary = [
    "basketball", "football", "soccer", "baseball", "volleyball", "tennis", "golf",
    "fitness", "gym", "running", "hiking", "skiing", "surfing",
    "music", "guitar", "piano", "singing", "dj",
    "photography", "art", "design", "fashion",
    "finance", "business", "entrepreneur", "marketing", "accounting",
    "engineering", "computer", "coding", "tech",
    "biology", "pre-med", "nursing", "psychology",
    "philanthropy", "volunteer", "community",
    "travel", "food", "cooking", "coffee",
    "family", "friends", "faith",
  ];

  const interests = dictionary.filter((w) => lower.includes(w));
  if (context?.major) {
    const major = context.major.toLowerCase();
    if (major.includes("business") || major.includes("finance")) interests.push("business");
    if (major.includes("engineer") || major.includes("computer")) interests.push("tech");
  }

  return {
    interests: normalizeTags(interests),
    traits: [],
    summary: interests.length
      ? `Interests detected from bio: ${interests.slice(0, 5).join(", ")}.`
      : "Bio saved; add interests manually for better matching.",
  };
}
