import type { SupabaseClient } from "@supabase/supabase-js";

export interface PaymentRow {
  id: string;
  amount: number | string;
  paid_amount: number | string;
  status: string;
  category: string | null;
  title?: string | null;
}

type PaymentWithItem = {
  id: string;
  amount: number | string;
  paid_amount: number | string;
  status: string;
  payment_items?: { category?: string; title?: string } | { category?: string; title?: string }[] | null;
};

/** Flatten payments + nested payment_items for ledger/sync. */
export function normalizePaymentsForLedger(rows: PaymentWithItem[]): PaymentRow[] {
  return rows.map((p) => {
    const item = Array.isArray(p.payment_items) ? p.payment_items[0] : p.payment_items;
    return {
      id: p.id,
      amount: p.amount,
      paid_amount: p.paid_amount,
      status: p.status,
      category: item?.category ?? null,
      title: item?.title ?? null,
    };
  });
}

const PAYMENT_SELECT = "id, amount, paid_amount, status, payment_items(category, title)";

export interface ReimbursementRow {
  id: string;
  amount: number | string;
  status: string;
  category: string;
}

/** Map payment.category → budget income line label */
export const PAYMENT_INCOME_LINE: Record<string, string> = {
  dues: "Chapter dues",
  fees: "Chapter dues",
  national_dues: "National dues",
  housing: "Housing & rent",
  housing_charges: "Housing & rent",
  social_fees: "Social & formal fees",
  formal_fees: "Social & formal fees",
  philanthropy: "Philanthropy & donations",
  merchandise: "Merchandise income",
  team_dues: "Team dues",
  travel: "Travel & sports income",
  tournament: "Travel & sports income",
  uniforms: "Equipment & uniforms income",
  other: "Other income",
};

export const DEFAULT_INCOME_LINES = [
  "Chapter dues",
  "National dues",
  "Housing & rent",
  "Philanthropy & donations",
  "Social & formal fees",
  "Merchandise income",
  "Team dues",
  "Travel & sports income",
  "Other income",
];

export const DEFAULT_EXPENSE_LINES = [
  "Reimbursements (paid)",
  "Reimbursements (approved, unpaid)",
  "Events & programming",
  "Operations",
  "Other expenses",
];

export function paymentBudgetLine(category: string | null): string {
  if (!category) return "Chapter dues";
  return PAYMENT_INCOME_LINE[category] ?? "Other income";
}

export function aggregatePaymentIncome(payments: PaymentRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const p of payments) {
    const collected = Number(p.paid_amount ?? 0);
    if (collected <= 0) continue;
    const line = paymentBudgetLine(p.category);
    totals.set(line, (totals.get(line) ?? 0) + collected);
  }
  return totals;
}

export function aggregateReimbursementExpenses(reimbs: ReimbursementRow[]): {
  paidByCategory: Map<string, number>;
  paidTotal: number;
  approvedUnpaid: number;
} {
  const paidByCategory = new Map<string, number>();
  let paidTotal = 0;
  let approvedUnpaid = 0;

  for (const r of reimbs) {
    const amt = Number(r.amount ?? 0);
    if (r.status === "paid") {
      paidTotal += amt;
      const line = `Reimbursement: ${r.category}`;
      paidByCategory.set(line, (paidByCategory.get(line) ?? 0) + amt);
    } else if (r.status === "approved") {
      approvedUnpaid += amt;
    }
  }

  return { paidByCategory, paidTotal, approvedUnpaid };
}

export interface FinanceLedger {
  incomeByLine: Array<{ line: string; amount: number }>;
  expenseByLine: Array<{ line: string; amount: number }>;
  totalCollected: number;
  totalPaidReimbursements: number;
  approvedReimbursementsUnpaid: number;
  philanthropyCampaigns: number;
  paymentCount: number;
  reimbursementCount: number;
}

export function buildFinanceLedger(
  payments: PaymentRow[],
  reimbs: ReimbursementRow[],
  philanthropyRaised = 0,
): FinanceLedger {
  const incomeMap = aggregatePaymentIncome(payments);
  if (philanthropyRaised > 0) {
    incomeMap.set(
      "Philanthropy & donations",
      (incomeMap.get("Philanthropy & donations") ?? 0) + philanthropyRaised,
    );
  }

  const { paidByCategory, paidTotal, approvedUnpaid } = aggregateReimbursementExpenses(reimbs);

  const incomeByLine = [...incomeMap.entries()]
    .map(([line, amount]) => ({ line, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const expenseByLine: Array<{ line: string; amount: number }> = [];
  if (paidTotal > 0) {
    expenseByLine.push({ line: "Reimbursements (paid)", amount: Math.round(paidTotal * 100) / 100 });
  }
  for (const [line, amount] of paidByCategory.entries()) {
    expenseByLine.push({ line, amount: Math.round(amount * 100) / 100 });
  }
  if (approvedUnpaid > 0) {
    expenseByLine.push({
      line: "Reimbursements (approved, unpaid)",
      amount: Math.round(approvedUnpaid * 100) / 100,
    });
  }

  const totalCollected = incomeByLine.reduce((s, i) => s + i.amount, 0);

  return {
    incomeByLine,
    expenseByLine,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalPaidReimbursements: Math.round(paidTotal * 100) / 100,
    approvedReimbursementsUnpaid: Math.round(approvedUnpaid * 100) / 100,
    philanthropyCampaigns: philanthropyRaised,
    paymentCount: payments.filter((p) => Number(p.paid_amount) > 0).length,
    reimbursementCount: reimbs.length,
  };
}

type BudgetLineRow = {
  id: string;
  category: string;
  type: string;
  actual: number;
};

export async function applyBudgetSync(
  supabase: SupabaseClient,
  orgId: string,
  budgetId: string,
  opts?: { actorId?: string },
): Promise<{
  updates: Array<{ lineId: string; category: string; previous: number; next: number }>;
  ledger: FinanceLedger;
  budget: unknown;
}> {
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, org_id, budget_lines(*)")
    .eq("id", budgetId)
    .eq("org_id", orgId)
    .single();

  if (!budget) throw new Error("Budget not found");

  const [paymentsRes, campaignsRes, reimbsRes] = await Promise.all([
    supabase.from("payments").select(PAYMENT_SELECT).eq("org_id", orgId),
    supabase.from("philanthropy_campaigns").select("raised_amount").eq("org_id", orgId),
    supabase.from("reimbursements").select("id, amount, status, category").eq("org_id", orgId),
  ]);

  const payments = normalizePaymentsForLedger((paymentsRes.data ?? []) as PaymentWithItem[]);
  const reimbs = (reimbsRes.data ?? []) as ReimbursementRow[];
  const philanthropyRaised = (campaignsRes.data ?? []).reduce(
    (s, c) => s + Number((c as { raised_amount?: number }).raised_amount ?? 0),
    0,
  );

  const ledger = buildFinanceLedger(payments, reimbs, philanthropyRaised);
  const incomeMap = aggregatePaymentIncome(payments);
  if (philanthropyRaised > 0) {
    incomeMap.set(
      "Philanthropy & donations",
      (incomeMap.get("Philanthropy & donations") ?? 0) + philanthropyRaised,
    );
  }

  const { paidByCategory, paidTotal, approvedUnpaid } = aggregateReimbursementExpenses(reimbs);

  let lines = (budget.budget_lines ?? []) as BudgetLineRow[];
  const updates: Array<{ lineId: string; category: string; previous: number; next: number }> = [];

  async function upsertLine(
    category: string,
    type: "income" | "expense",
    actual: number,
    description: string,
  ) {
    if (actual <= 0 && type === "expense" && !category.includes("approved")) {
      const existing = lines.find((l) => l.category === category && l.type === type);
      if (existing && Number(existing.actual) > 0) {
        await supabase.from("budget_lines").update({ actual: 0 }).eq("id", existing.id);
        updates.push({ lineId: existing.id, category, previous: Number(existing.actual), next: 0 });
      }
      return;
    }
    if (actual <= 0) return;

    let line = lines.find((l) => l.category === category && l.type === type);
    if (!line) {
      const { data: created } = await supabase
        .from("budget_lines")
        .insert({
          budget_id: budgetId,
          category,
          type,
          description,
          budgeted: actual,
          actual,
        })
        .select("id, category, type, actual")
        .single();
      if (created) {
        line = created as BudgetLineRow;
        lines = [...lines, line];
        updates.push({ lineId: line.id, category, previous: 0, next: actual });
      }
      return;
    }

    const previous = Number(line.actual ?? 0);
    if (Math.abs(previous - actual) > 0.009) {
      await supabase.from("budget_lines").update({ actual }).eq("id", line.id);
      updates.push({ lineId: line.id, category, previous, next: actual });
      line.actual = actual;
    }
  }

  for (const [lineName, amount] of incomeMap.entries()) {
    await upsertLine(lineName, "income", amount, "Synced from Payments module");
  }

  await upsertLine("Reimbursements (paid)", "expense", paidTotal, "Synced from paid reimbursements");
  for (const [catLine, amount] of paidByCategory.entries()) {
    await upsertLine(catLine, "expense", amount, "Synced from reimbursements by category");
  }
  await upsertLine(
    "Reimbursements (approved, unpaid)",
    "expense",
    approvedUnpaid,
    "Approved reimbursements not yet paid",
  );

  if (opts?.actorId) {
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: opts.actorId,
      action: "budget_synced",
      resource_type: "budgets",
      resource_id: budgetId,
      metadata: { updates, ledger },
    });
  }

  const { data: refreshed } = await supabase
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("id", budgetId)
    .single();

  return { updates, ledger, budget: refreshed };
}

/** Sync the org's most recently created budget (if any). */
export async function syncActiveOrgBudget(
  supabase: SupabaseClient,
  orgId: string,
  actorId?: string,
) {
  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!budget) return null;
  return applyBudgetSync(supabase, orgId, budget.id, { actorId });
}
