/** Common university majors for searchable profile dropdown. */

export const SCHOOL_MAJORS: string[] = [
  "Accounting",
  "Aerospace Engineering",
  "Agricultural Sciences",
  "Anthropology",
  "Architecture",
  "Art History",
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
  "Environmental Science",
  "Finance",
  "Fine Arts",
  "Graphic Design",
  "History",
  "Hospitality Management",
  "Human Resources",
  "Industrial Engineering",
  "Information Systems",
  "International Relations",
  "Journalism",
  "Kinesiology",
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
  "Real Estate",
  "Social Work",
  "Sociology",
  "Software Engineering",
  "Sports Management",
  "Statistics",
  "Supply Chain Management",
  "Theater",
  "Undeclared",
];

export const CLASS_YEARS = [
  { value: "Freshman", label: "Freshman" },
  { value: "Sophomore", label: "Sophomore" },
  { value: "Junior", label: "Junior" },
  { value: "Senior", label: "Senior" },
  { value: "Graduate", label: "Graduate" },
] as const;

export function graduationYearOptions(): Array<{ value: string; label: string }> {
  const current = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => {
    const y = String(current + i);
    return { value: y, label: y };
  });
}

export function filterMajors(query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return SCHOOL_MAJORS.slice(0, limit);
  return SCHOOL_MAJORS.filter((m) => m.toLowerCase().includes(q)).slice(0, limit);
}
