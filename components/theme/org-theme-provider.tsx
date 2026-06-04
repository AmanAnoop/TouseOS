"use client";

import { useEffect } from "react";
import { pickReadableTextColor } from "@/lib/color-utils";
import { getUniversityById } from "@/lib/university-colors";
import type { Organization } from "@/types";

function readSettings(org: Organization | null): { universityId?: string } {
  const s = org?.settings as Record<string, unknown> | undefined;
  if (!s) return {};
  return {
    universityId: typeof s.university_id === "string" ? s.university_id : undefined,
  };
}

/** Injects org/school brand CSS variables (unchanged across light/dark). */
export function OrgThemeProvider({ org }: { org: Organization | null }) {
  useEffect(() => {
    const root = document.documentElement;
    const { universityId } = readSettings(org);
    const uni = getUniversityById(universityId);

    const orgPrimary = org?.primary_color?.trim() || "#500000";
    const orgAccent = org?.secondary_color?.trim() || "#FFFFFF";
    const schoolPrimary = uni?.primary ?? orgPrimary;
    const schoolAccent = uni?.secondary ?? "#C0A96B";

    const onBrand = pickReadableTextColor(orgPrimary);
    root.style.setProperty("--color-org-primary", orgPrimary);
    root.style.setProperty("--color-org-accent", orgAccent);
    root.style.setProperty("--color-school-primary", schoolPrimary);
    root.style.setProperty("--color-school-accent", schoolAccent);
    root.style.setProperty("--color-text-on-brand", onBrand);
  }, [org]);

  return null;
}
