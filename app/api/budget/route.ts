import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXPENSE_LINES, DEFAULT_INCOME_LINES } from "@/lib/budget-sync";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";
import { forbidUnless, getMemberRole } from "@/lib/api-org-role";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  const canView = forbidUnless(role, "view_payments") === null
    || forbidUnless(role, "manage_budget") === null
    || forbidUnless(role, "manage_payments") === null;
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("org_id", orgId)
    .order("fiscal_year", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, label, period, fiscalYear, semester, totalBudget, notes, lines } = body;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const denied = forbidUnless(role, "manage_budget");
  if (denied) return denied;

  const { data: budget, error } = await supabase.from("budgets").insert({
    org_id: orgId,
    label,
    period: period ?? "semester",
    fiscal_year: fiscalYear ?? new Date().getFullYear(),
    semester: semester || null,
    total_budget: parseFloat(totalBudget ?? "0"),
    notes: notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lineRows = lines?.length
    ? lines.map((l: Record<string, unknown>) => ({
        budget_id: budget.id,
        category: l.category,
        type: l.type,
        description: l.description || null,
        budgeted: parseFloat(String(l.budgeted ?? "0")),
        actual: parseFloat(String(l.actual ?? "0")),
      }))
    : [
        ...DEFAULT_INCOME_LINES.map((category) => ({
          budget_id: budget.id,
          category,
          type: "income",
          description: "Linked to Payments",
          budgeted: 0,
          actual: 0,
        })),
        ...DEFAULT_EXPENSE_LINES.map((category) => ({
          budget_id: budget.id,
          category,
          type: "expense",
          description: "Linked to Reimbursements",
          budgeted: 0,
          actual: 0,
        })),
      ];

  if (lineRows.length) {
    await supabase.from("budget_lines").insert(lineRows);
  }

  void triggerBudgetSyncForOrg(orgId, user.id);

  const { data: full } = await supabase
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("id", budget.id)
    .single();

  return NextResponse.json(full ?? budget, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    budgetId,
    lineId,
    action,
    category,
    type,
    description,
    budgeted,
    actual,
    ...updates
  } = body;

  let resolvedOrgId = orgId ? String(orgId) : null;
  if (!resolvedOrgId && budgetId) {
    const { data: budgetRow } = await supabase.from("budgets").select("org_id").eq("id", budgetId).single();
    resolvedOrgId = budgetRow?.org_id ?? null;
  }
  if (!resolvedOrgId && lineId) {
    const { data: lineRow } = await supabase
      .from("budget_lines")
      .select("budget_id, budgets(org_id)")
      .eq("id", lineId)
      .single();
    const nested = lineRow?.budgets as { org_id?: string } | { org_id?: string }[] | null;
    const b = Array.isArray(nested) ? nested[0] : nested;
    resolvedOrgId = b?.org_id ?? null;
  }
  if (!resolvedOrgId) {
    return NextResponse.json({ error: "orgId or budgetId required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, resolvedOrgId);
  const denied = forbidUnless(role, "manage_budget");
  if (denied) return denied;

  if (action === "delete" && lineId) {
    const { error } = await supabase.from("budget_lines").delete().eq("id", lineId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  if (action === "add" && budgetId) {
    const { data, error } = await supabase.from("budget_lines").insert({
      budget_id: budgetId,
      category,
      type: type ?? "expense",
      description: description || null,
      budgeted: parseFloat(String(budgeted ?? "0")),
      actual: parseFloat(String(actual ?? "0")),
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (lineId) {
    const lineUpdates: Record<string, unknown> = {};
    if (actual !== undefined) lineUpdates.actual = actual;
    if (budgeted !== undefined) lineUpdates.budgeted = budgeted;
    Object.assign(lineUpdates, updates);
    const { data, error } = await supabase.from("budget_lines").update(lineUpdates).eq("id", lineId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (budgetId) {
    const { data, error } = await supabase.from("budgets").update(updates).eq("id", budgetId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "budgetId or lineId required" }, { status: 400 });
}
