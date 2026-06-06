/** Shared class year and major options for join, PNM, and profile forms. */

import { TEXAS_AM_MAJORS } from "@/lib/texas-am-majors";

const CLASS_YEAR_START = 2024;

function buildYearOptions(from: number, through: number): Array<{ value: string; label: string }> {
  const years: Array<{ value: string; label: string }> = [];
  for (let y = through; y >= from; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

/** Class year (expected graduation) — from 2024 through six years ahead. */
export const CLASS_YEAR_OPTIONS = buildYearOptions(
  CLASS_YEAR_START,
  new Date().getFullYear() + 6,
);

/** Graduation / alumni year — same range for dropdowns. */
export const GRAD_YEAR_OPTIONS = CLASS_YEAR_OPTIONS;

/** Texas A&M-scale major list — deduped fallback when school-specific list unavailable. */
export const COMMON_MAJORS = [
  ...new Set([
    ...TEXAS_AM_MAJORS,
    "Communications",
    "Human Biology",
    "Information Systems",
    "International Relations",
    "Pre-Law",
    "Pre-Med",
    "Public Policy",
    "Undeclared",
  ]),
].sort((a, b) => a.localeCompare(b)) as readonly string[];

export const MAJOR_COMBOBOX_OPTIONS = COMMON_MAJORS.map((m) => ({ value: m, label: m }));

export const MAJOR_SELECT_OPTIONS = [
  { value: "", label: "Select major…" },
  ...MAJOR_COMBOBOX_OPTIONS,
];
