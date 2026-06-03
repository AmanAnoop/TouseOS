import { blendHex, hexToHslChannels } from "@/lib/color-utils";
import { REGAL, REGAL_PRIMARY, REGAL_SECONDARY } from "@/lib/regal-theme";
import type { GreekLetterOrg } from "@/lib/greek-letter-orgs";
import type { UniversityPreset } from "@/lib/university-colors";

export interface ChapterThemeInput {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  greekOrg?: GreekLetterOrg | null;
  university?: UniversityPreset | null;
}

/** Build chapter primary/secondary by blending regal base + university + letters. */
export function resolveChapterColors(input: ChapterThemeInput): { primary: string; secondary: string } {
  const lettersPrimary = input.greekOrg?.primary ?? input.primaryColor ?? REGAL_PRIMARY;
  const lettersSecondary = input.greekOrg?.secondary ?? input.secondaryColor ?? REGAL_SECONDARY;
  const uniPrimary = input.university?.primary;
  const uniSecondary = input.university?.secondary;

  let primary = lettersPrimary;
  let secondary = lettersSecondary;

  if (uniPrimary) {
    primary = blendHex(uniPrimary, lettersPrimary, 0.38);
    secondary = blendHex(uniSecondary ?? uniPrimary, lettersSecondary, 0.32);
  }

  primary = blendHex(primary, REGAL.racingGreen, 0.22);
  secondary = blendHex(secondary, REGAL.navy, 0.28);

  if (input.primaryColor && !input.greekOrg && !input.university) {
    primary = input.primaryColor;
    secondary = input.secondaryColor ?? REGAL_SECONDARY;
  }

  return { primary, secondary };
}

/** Lightness steps for greek scale (50 = lightest). */
const SCALE_LIGHTNESS = [97, 94, 88, 78, 62, 48, 38, 30, 22, 16, 10];

function scaleFromPrimary(primaryHex: string, secondaryHex: string): Record<string, string> {
  const p = hexToHslChannels(primaryHex);
  const s = hexToHslChannels(secondaryHex);
  const [ph] = p.split(" ");
  const [sh] = s.split(" ");

  const vars: Record<string, string> = {};
  SCALE_LIGHTNESS.forEach((light, i) => {
    const key = i === 0 ? "50" : i === 1 ? "100" : i === 2 ? "200" : i === 3 ? "300" : i === 4 ? "400"
      : i === 5 ? "500" : i === 6 ? "600" : i === 7 ? "700" : i === 8 ? "800" : i === 9 ? "900" : "950";
    const sat = i < 5 ? "18%" : i < 8 ? "42%" : "55%";
    vars[`--greek-${key}`] = `${ph} ${sat} ${light}%`;
  });
  vars["--greek-600"] = p;
  vars["--greek-700"] = `${ph} 48% 32%`;
  vars["--greek-800"] = s;
  vars["--greek-900"] = `${sh} 55% 14%`;
  vars["--greek-950"] = REGAL.navyDeep.replace("#", "") ? hexToHslChannels(REGAL.navyDeep) : `${sh} 60% 8%`;
  return vars;
}

export function buildChapterThemeCss(input: ChapterThemeInput): string {
  const { primary, secondary } = resolveChapterColors(input);
  const greek = scaleFromPrimary(primary, secondary);
  const primaryHsl = hexToHslChannels(primary);
  const navyHsl = hexToHslChannels(REGAL.navy);

  const lines = [
    ...Object.entries(greek).map(([k, v]) => `  ${k}: ${v};`),
    `  --primary: ${primaryHsl};`,
    `  --primary-foreground: 45 30% 98%;`,
    `  --ring: ${primaryHsl};`,
    `  --accent: ${hexToHslChannels(REGAL.gold)};`,
    `  --accent-foreground: ${navyHsl};`,
    `  --chapter-primary: ${primary};`,
    `  --chapter-secondary: ${secondary};`,
  ];

  return `:root {\n${lines.join("\n")}\n}`;
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

export function applyRegalDarkSurfaces() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("theme-regal");
}
