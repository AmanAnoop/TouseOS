import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getFinanceOfficerRole } from "@/lib/finance-access";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/finance-categories";
import { DEFAULT_EXPENSE_LINES, DEFAULT_INCOME_LINES } from "@/lib/budget-sync";

export type FinanceAuth =
  | { ok: true; supabase: SupabaseClient; userId: string; orgId: string }
  | { ok: false; response: NextResponse };

export async function requireFinanceOfficer(orgId: string): Promise<FinanceAuth> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await getFinanceOfficerRole(supabase, user.id, orgId);
  if (!role) {
    return { ok: false, response: NextResponse.json({ error: "Treasurer or president access required" }, { status: 403 }) };
  }
  return { ok: true, supabase, userId: user.id, orgId };
}

export async function getServiceDb() {
  return createServiceClient();
}

/** Ensure a semester budget exists with default category lines from finance wizard. */
export async function ensureSemesterBudgetFromFinance(
  service: SupabaseClient,
  orgId: string,
  opts: { label?: string; totalBudget?: number },
) {
  const { data: existing } = await service
    .from("budgets")
    .select("id, budget_lines(id)")
    .eq("org_id", orgId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id && (existing.budget_lines?.length ?? 0) > 0) {
    return { budgetId: existing.id as string, created: false };
  }

  const year = new Date().getFullYear();
  const semester = new Date().getMonth() < 6 ? "spring" : "fall";
  const label = opts.label ?? `Finance ${semester} ${year}`;

  const { data: budget, error } = await service
    .from("budgets")
    .insert({
      org_id: orgId,
      label,
      period: "semester",
      fiscal_year: year,
      semester,
      total_budget: opts.totalBudget ?? 0,
      notes: "Created by finance setup wizard",
    })
    .select("id")
    .single();

  if (error || !budget) return { error: error?.message ?? "Budget create failed" };

  const expenseCats = DEFAULT_BUDGET_CATEGORIES.filter((c) => c.type === "expense");
  const lineRows = [
    ...DEFAULT_INCOME_LINES.map((cat) => ({
      budget_id: budget.id,
      category: cat,
      type: "income",
      description: null,
      budgeted: cat === "Chapter dues" ? opts.totalBudget ?? 0 : 0,
      actual: 0,
    })),
    ...expenseCats.map((c) => ({
      budget_id: budget.id,
      category: c.label,
      type: "expense",
      description: `finance:${c.key}`,
      budgeted: 0,
      actual: 0,
    })),
    ...DEFAULT_EXPENSE_LINES.filter(
      (n) => !expenseCats.some((c) => c.label === n),
    ).map((cat) => ({
      budget_id: budget.id,
      category: cat,
      type: "expense",
      description: null,
      budgeted: 0,
      actual: 0,
    })),
  ];

  await service.from("budget_lines").insert(lineRows);
  return { budgetId: budget.id as string, created: true };
}
