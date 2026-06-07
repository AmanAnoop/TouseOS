"use client";

import { useEffect } from "react";
import { applyChapterTheme } from "@/lib/chapter-theme";
import { REGAL_PRIMARY, REGAL_SECONDARY } from "@/lib/regal-theme";

/** Applies regal base theme on onboarding/auth before an org exists. */
export function OnboardingRegalTheme() {
  useEffect(() => {
    document.documentElement.classList.add("theme-regal");
    applyChapterTheme({
      primaryColor: REGAL_PRIMARY,
      secondaryColor: REGAL_SECONDARY,
    });
  }, []);
  return null;
}
