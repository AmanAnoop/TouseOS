/** True when Supabase/PostgREST reports budgets.archived_at is missing (migration 029 not applied). */
export function isMissingBudgetArchiveColumn(error: { message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return m.includes("archived_at") || m.includes("schema cache");
}

export const BUDGET_ARCHIVE_MIGRATION_HINT =
  "Apply supabase/migrations/029_budget_rls_archive.sql in the Supabase SQL Editor (adds budgets.archived_at).";
