"use client";

import { useEffect, useMemo } from "react";
import { applyChapterTheme } from "@/lib/chapter-theme";
import { getGreekOrgById } from "@/lib/greek-letter-orgs";
import { getProductId } from "@/lib/org-product";
import { getUniversityById } from "@/lib/university-colors";
import type { Organization } from "@/types";

function readSettings(org: Organization | null): {
  greekAffiliationId?: string;
  universityId?: string;
} {
  const s = org?.settings as Record<string, unknown> | undefined;
  if (!s) return {};
  return {
    greekAffiliationId: typeof s.greek_affiliation_id === "string" ? s.greek_affiliation_id : undefined,
    universityId: typeof s.university_id === "string" ? s.university_id : undefined,
  };
}

export function ChapterThemeProvider({ org }: { org: Organization | null }) {
  const themeInput = useMemo(() => {
    const { greekAffiliationId, universityId } = readSettings(org);
    const product = getProductId(org?.type ?? "general_org");
    return {
      product,
      primaryColor: org?.primary_color,
      secondaryColor: org?.secondary_color,
      greekOrg: getGreekOrgById(greekAffiliationId),
      university: getUniversityById(universityId),
    };
  }, [org]);

  useEffect(() => {
    document.documentElement.classList.add("theme-regal");
    applyChapterTheme(themeInput);
  }, [themeInput]);

  return null;
}
