import { hexToHslChannels } from "@/lib/color-utils";
import { REGAL, REGAL_PRIMARY, REGAL_SECONDARY } from "@/lib/regal-theme";
import type { GreekLetterOrg } from "@/lib/greek-letter-orgs";
import type { UniversityPreset } from "@/lib/university-colors";
import type { ProductId } from "@/lib/org-product";

export interface ChapterThemeInput {
  product?: ProductId;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  greekOrg?: GreekLetterOrg | null;
  university?: UniversityPreset | null;
}

export interface ResolvedChapterColors {
  /** Fraternity/sorority (or regal default) — buttons, nav, primary actions */
  orgPrimary: string;
  orgSecondary: string;
  /** Campus — headers, accents, secondary UI (Greek dual-tone) */
  campusPrimary: string;
  campusSecondary: string;
}

export function resolveChapterColors(input: ChapterThemeInput): ResolvedChapterColors {
  const product = input.product ?? "greek";
  const uni = input.university?.id === "custom-campus" ? undefined : input.university;
  const greek = input.greekOrg?.id === "custom" ? undefined : input.greekOrg;

  const campusPrimary = uni?.primary ?? REGAL.navy;
  const campusSecondary = uni?.secondary ?? REGAL.racingGreen;

  if (product === "sports" || product === "club") {
    const useCustom =
      uni?.id === "custom-campus" ||
      Boolean(input.primaryColor && input.primaryColor !== campusPrimary);
    if (useCustom && input.primaryColor) {
      const primary = input.primaryColor;
      const secondary = input.secondaryColor ?? input.primaryColor;
      return {
        orgPrimary: primary,
        orgSecondary: secondary,
        campusPrimary: primary,
        campusSecondary: secondary,
      };
    }
    return {
      orgPrimary: campusPrimary,
      orgSecondary: campusSecondary,
      campusPrimary,
      campusSecondary,
    };
  }

  const orgPrimary = greek?.primary ?? input.primaryColor ?? REGAL_PRIMARY;
  const orgSecondary = greek?.secondary ?? input.secondaryColor ?? REGAL_SECONDARY;

  return {
    orgPrimary,
    orgSecondary,
    campusPrimary,
    campusSecondary,
  };
}

const SCALE_LIGHTNESS = [97, 94, 88, 78, 62, 48, 38, 30, 22, 16, 10];

function scaleFromHex(primaryHex: string, secondaryHex: string, prefix: string): Record<string, string> {
  const p = hexToHslChannels(primaryHex);
  const s = hexToHslChannels(secondaryHex);
  const [ph] = p.split(" ");
  const [sh] = s.split(" ");

  const vars: Record<string, string> = {};
  SCALE_LIGHTNESS.forEach((light, i) => {
    const key = i === 0 ? "50" : i === 1 ? "100" : i === 2 ? "200" : i === 3 ? "300" : i === 4 ? "400"
      : i === 5 ? "500" : i === 6 ? "600" : i === 7 ? "700" : i === 8 ? "800" : i === 9 ? "900" : "950";
    const sat = i < 5 ? "18%" : i < 8 ? "42%" : "55%";
    vars[`${prefix}-${key}`] = `${ph} ${sat} ${light}%`;
  });
  vars[`${prefix}-600`] = p;
  vars[`${prefix}-700`] = `${ph} 48% 32%`;
  vars[`${prefix}-800`] = s;
  vars[`${prefix}-900`] = `${sh} 55% 14%`;
  vars[`${prefix}-950`] = hexToHslChannels(REGAL.navyDeep);
  return vars;
}

export function buildChapterThemeCss(input: ChapterThemeInput): string {
  const product = input.product ?? "greek";
  const colors = resolveChapterColors(input);
  const orgScale = scaleFromHex(colors.orgPrimary, colors.orgSecondary, "--greek");
  const campusScale = scaleFromHex(colors.campusPrimary, colors.campusSecondary, "--campus");
  const sportsScale = scaleFromHex(colors.orgPrimary, colors.orgSecondary, "--sports");

  const orgHsl = hexToHslChannels(colors.orgPrimary);
  const campusHsl = hexToHslChannels(colors.campusPrimary);
  const navyHsl = hexToHslChannels(REGAL.navy);

  const lines = [
    ...Object.entries(orgScale).map(([k, v]) => `  ${k}: ${v};`),
    ...Object.entries(campusScale).map(([k, v]) => `  ${k}: ${v};`),
    ...(product === "sports" || product === "club"
      ? Object.entries(sportsScale).map(([k, v]) => `  ${k}: ${v};`)
      : []),
    `  --primary: ${orgHsl};`,
    `  --primary-foreground: 45 30% 98%;`,
    `  --ring: ${orgHsl};`,
    `  --accent: ${campusHsl};`,
    `  --accent-foreground: 45 30% 98%;`,
    `  --chapter-org-primary: ${colors.orgPrimary};`,
    `  --chapter-org-secondary: ${colors.orgSecondary};`,
    `  --chapter-campus-primary: ${colors.campusPrimary};`,
    `  --chapter-campus-secondary: ${colors.campusSecondary};`,
    `  --regal-navy: ${navyHsl};`,
    `  --regal-green: ${hexToHslChannels(REGAL.racingGreen)};`,
    `  --regal-gold: ${hexToHslChannels(REGAL.gold)};`,
  ];

  return `:root {\n${lines.join("\n")}\n}`;
}

/** Colors to persist on organizations row */
export function colorsForOrgStorage(
  input: ChapterThemeInput,
): { primary_color: string; secondary_color: string } {
  const c = resolveChapterColors(input);
  if (input.product === "sports" || input.product === "club") {
    return { primary_color: c.campusPrimary, secondary_color: c.campusSecondary };
  }
  return { primary_color: c.orgPrimary, secondary_color: c.orgSecondary };
}

export function applyChapterTheme(input: ChapterThemeInput) {
  if (typeof document === "undefined") return;
  const css = buildChapterThemeCss(input);
  let el = document.getElementById("chapter-theme-vars");
  if (!el) {
    el = document.createElement("style");
    el.id = "chapter-theme-vars";
    document.head.appendChild(el);
  }
  el.textContent = css;
}
