export function getUniversityAdminEmails(): string[] {
  const raw = process.env.UNIVERSITY_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getUniversityAdminCampuses(): string[] {
  const raw = process.env.UNIVERSITY_ADMIN_CAMPUSES ?? "";
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function isUniversityAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getUniversityAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}
