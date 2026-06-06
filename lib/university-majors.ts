import { COMMON_MAJORS, MAJOR_COMBOBOX_OPTIONS } from "@/lib/academic-fields";

/** School-specific major additions (merged with COMMON_MAJORS). */
const UNIVERSITY_MAJOR_ADDITIONS: Record<string, string[]> = {
  "texas-a-and-m": ["Petroleum Engineering", "Poultry Science", "Agricultural Leadership"],
  "texas": ["Petroleum Engineering", "Radio-Television-Film", "Plan II Honors"],
  "berkeley": ["EECS", "Molecular & Cell Biology", "Legal Studies"],
  "georgia-tech": ["Industrial Design", "Building Construction"],
  "mit": ["Course 6 (EECS)", "Course 2 (Mechanical Engineering)"],
  "stanford": ["Symbolic Systems", "Management Science & Engineering"],
  "michigan": ["Ross BBA", "Sport Management"],
  "ohio-state": ["Aviation", "Fisher College of Business"],
  "penn-state": ["Supply Chain & Information Systems", "Recreation, Park, and Tourism Management"],
  "florida": ["Tourism, Hospitality & Event Management", "Wildlife Ecology"],
  "usc": ["Cinematic Arts", "Business Administration"],
  "ucla": ["World Arts and Cultures", "Computational & Systems Biology"],
};

export function majorsForUniversity(universityId?: string | null): Array<{ value: string; label: string }> {
  if (!universityId || universityId === "custom-campus") {
    return MAJOR_COMBOBOX_OPTIONS;
  }
  const extra = UNIVERSITY_MAJOR_ADDITIONS[universityId] ?? [];
  const merged = [...new Set([...COMMON_MAJORS, ...extra])].sort((a, b) => a.localeCompare(b));
  return merged.map((m) => ({ value: m, label: m }));
}
