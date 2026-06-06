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

export const COMMON_MAJORS = [
  "Accounting",
  "Aerospace Engineering",
  "Biology",
  "Biomedical Engineering",
  "Business Administration",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Communications",
  "Computer Science",
  "Criminal Justice",
  "Economics",
  "Electrical Engineering",
  "English",
  "Environmental Science",
  "Finance",
  "History",
  "Information Systems",
  "International Relations",
  "Kinesiology",
  "Marketing",
  "Mathematics",
  "Mechanical Engineering",
  "Nursing",
  "Philosophy",
  "Physics",
  "Political Science",
  "Pre-Law",
  "Pre-Med",
  "Psychology",
  "Public Health",
  "Sociology",
  "Undeclared",
] as const;

export const MAJOR_SELECT_OPTIONS = [
  { value: "", label: "Select major…" },
  ...COMMON_MAJORS.map((m) => ({ value: m, label: m })),
  { value: "__other__", label: "Other (type below)" },
];
