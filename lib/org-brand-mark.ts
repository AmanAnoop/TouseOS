import { GREEK_LETTER_ORGS, getGreekOrgById } from "@/lib/greek-letter-orgs";
import { getSportType, inferSportTypeFromName } from "@/lib/sports-types";
import type { Organization } from "@/types";

export interface OrgBrandMark {
  label: string;
  /** Suggested font size (px) for compact marks */
  fontSize?: number;
}

function matchGreekOrgByName(name: string) {
  const lower = name.toLowerCase();
  return GREEK_LETTER_ORGS.find((o) => {
    if (o.id === "custom") return false;
    return lower.includes(o.name.toLowerCase());
  });
}

export function orgBrandMark(org: Pick<Organization, "name" | "type" | "settings">): OrgBrandMark {
  const settings = (org.settings ?? {}) as Record<string, unknown>;

  if (org.type === "fraternity" || org.type === "sorority") {
    const affiliationId = typeof settings.greek_affiliation_id === "string"
      ? settings.greek_affiliation_id
      : "";
    const greek = getGreekOrgById(affiliationId) ?? matchGreekOrgByName(org.name);
    if (greek && greek.id !== "custom" && greek.letters !== "—") {
      return { label: greek.letters, fontSize: greek.letters.length > 2 ? 10 : 11 };
    }
    return { label: org.name.slice(0, 2).toUpperCase(), fontSize: 11 };
  }

  if (org.type === "club_sports") {
    const sportType = typeof settings.sport_type === "string" ? settings.sport_type : "";
    const sport = getSportType(sportType) ?? inferSportTypeFromName(org.name);
    if (sport) return { label: sport.mark, fontSize: 16 };
    return { label: "🏆", fontSize: 16 };
  }

  return { label: org.name.slice(0, 2).toUpperCase(), fontSize: 11 };
}
