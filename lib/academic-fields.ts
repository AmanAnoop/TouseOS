/** Shared class year and major options for join, PNM, and profile forms. */

function buildClassYears(): Array<{ value: string; label: string }> {
  const current = new Date().getFullYear();
  const years: Array<{ value: string; label: string }> = [];
  for (let y = current + 6; y >= current - 2; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export const CLASS_YEAR_OPTIONS = buildClassYears();

/** Curated list of 50 common US university majors — spec fallback when school list unavailable. */
export const COMMON_MAJORS = [
  "Accounting",
  "Aerospace Engineering",
  "Anthropology",
  "Architecture",
  "Biochemistry",
  "Biology",
  "Biomedical Engineering",
  "Business Administration",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Communications",
  "Computer Engineering",
  "Computer Science",
  "Criminal Justice",
  "Data Science",
  "Economics",
  "Electrical Engineering",
  "English",
  "Environmental Engineering",
  "Environmental Science",
  "Finance",
  "Graphic Design",
  "History",
  "Human Biology",
  "Industrial Engineering",
  "Information Systems",
  "International Relations",
  "Journalism",
  "Kinesiology",
  "Management",
  "Marketing",
  "Mathematics",
  "Mechanical Engineering",
  "Music",
  "Neuroscience",
  "Nursing",
  "Philosophy",
  "Physics",
  "Political Science",
  "Pre-Law",
  "Pre-Med",
  "Psychology",
  "Public Health",
  "Public Policy",
  "Social Work",
  "Sociology",
  "Statistics",
  "Supply Chain Management",
  "Undeclared",
] as const;

export const MAJOR_COMBOBOX_OPTIONS = COMMON_MAJORS.map((m) => ({ value: m, label: m }));

export const MAJOR_SELECT_OPTIONS = [
  { value: "", label: "Select major…" },
  ...MAJOR_COMBOBOX_OPTIONS,
];
