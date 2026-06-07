/** Normalize budget rows from Supabase / API for the budget UI. */
export interface BudgetLineRecord {
  id: string;
  budget_id: string;
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

export interface BudgetRecord {
  id: string;
  label: string;
  period: string;
  fiscal_year: number | null;
  semester: string | null;
  total_budget: number;
  notes: string | null;
  archived_at: string | null;
  budget_lines: BudgetLineRecord[];
}

export function normalizeBudgetLine(raw: Record<string, unknown>): BudgetLineRecord {
  return {
    id: String(raw.id),
    budget_id: String(raw.budget_id),
    category: String(raw.category ?? ""),
    type: (raw.type === "income" ? "income" : "expense") as "income" | "expense",
    description: raw.description != null ? String(raw.description) : null,
    budgeted: Number(raw.budgeted ?? 0),
    actual: Number(raw.actual ?? 0),
  };
}

export function normalizeBudgetRecord(raw: Record<string, unknown>): BudgetRecord {
  const linesRaw = raw.budget_lines;
  const lines = Array.isArray(linesRaw)
    ? linesRaw.map((l) => normalizeBudgetLine(l as Record<string, unknown>))
    : [];

  lines.sort((a, b) => {
    if (a.type !== b.type) return a.type === "income" ? -1 : 1;
    return a.category.localeCompare(b.category);
  });

  return {
    id: String(raw.id),
    label: String(raw.label ?? "Budget"),
    period: String(raw.period ?? "semester"),
    fiscal_year: raw.fiscal_year != null ? Number(raw.fiscal_year) : null,
    semester: raw.semester != null ? String(raw.semester) : null,
    total_budget: Number(raw.total_budget ?? 0),
    notes: raw.notes != null ? String(raw.notes) : null,
    archived_at: raw.archived_at != null ? String(raw.archived_at) : null,
    budget_lines: lines,
  };
}

export function activeBudgets(list: BudgetRecord[]): BudgetRecord[] {
  return list.filter((b) => !b.archived_at);
}

export function archivedBudgets(list: BudgetRecord[]): BudgetRecord[] {
  return list.filter((b) => Boolean(b.archived_at));
}

export function normalizeBudgetList(payload: unknown): BudgetRecord[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((row) => normalizeBudgetRecord(row as Record<string, unknown>));
}
