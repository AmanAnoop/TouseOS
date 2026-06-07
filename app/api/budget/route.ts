import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBudgetList, normalizeBudgetRecord } from "@/lib/budget-api";
import { budgetWriteClient } from "@/lib/budget-write";
import { getMemberRole } from "@/lib/api-org-role";
import { can, type RoleName } from "@/lib/permissions";
import { DEFAULT_EXPENSE_LINES, DEFAULT_INCOME_LINES } from "@/lib/budget-sync";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";
import {
  BUDGET_ARCHIVE_MIGRATION_HINT,
  isMissingBudgetArchiveColumn,
} from "@/lib/budget-archive-column";

function canViewBudget(role: RoleName | null): boolean {
  if (!role) return false;
  return can(role, "manage_budget") || can(role, "view_payments") || can(role, "manage_payments");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const includeArchived = searchParams.get("include_archived") === "1";
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canViewBudget(role)) {
    return NextResponse.json({ error: "Budget access requires officer or treasurer role" }, { status: 403 });
  }

  let query = supabase
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  let { data, error } = await query;
  if (isMissingBudgetArchiveColumn(error)) {
    const fallback = await supabase
      .from("budgets")
      .select("*, budget_lines(*)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeBudgetList(data ?? []));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, label, period, fiscalYear, semester, totalBudget, notes, lines } = body;
  if (!orgId || !label?.trim()) {
    return NextResponse.json({ error: "orgId and label required" }, { status: 400 });
  }

  const write = await budgetWriteClient(user.id, String(orgId));
  if (!write.ok) return write.response;
  const { db } = write;

  const insertBase = {
    org_id: orgId,
    label: String(label).trim(),
    period: period ?? "semester",
    fiscal_year: fiscalYear ?? new Date().getFullYear(),
    semester: semester || null,
    total_budget: parseFloat(totalBudget ?? "0"),
    notes: notes || null,
  };

  let { data: budget, error } = await db
    .from("budgets")
    .insert({ ...insertBase, archived_at: null })
    .select()
    .single();

  if (isMissingBudgetArchiveColumn(error)) {
    ({ data: budget, error } = await db.from("budgets").insert(insertBase).select().single());
  }

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
    const { error: linesError } = await db.from("budget_lines").insert(lineRows);
    if (linesError) {
      await db.from("budgets").delete().eq("id", budget.id);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }
  }

  void triggerBudgetSyncForOrg(orgId, user.id);

  const { data: full } = await db
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("id", budget.id)
    .single();

  return NextResponse.json(
    full ? normalizeBudgetRecord(full as Record<string, unknown>) : normalizeBudgetRecord(budget as Record<string, unknown>),
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    budgetId,
    lineId,
    action,
    category,
    type,
    description,
    budgeted,
    actual,
    orgId,
    label,
    ...updates
  } = body;

  let resolvedOrgId = orgId as string | undefined;
  if (!resolvedOrgId && budgetId) {
    const { data: b } = await supabase.from("budgets").select("org_id").eq("id", budgetId).maybeSingle();
    resolvedOrgId = b?.org_id;
  }
  if (!resolvedOrgId && lineId) {
    const { data: line } = await supabase
      .from("budget_lines")
      .select("budget_id, budgets(org_id)")
      .eq("id", lineId)
      .maybeSingle();
    const budgets = line?.budgets as { org_id?: string } | { org_id?: string }[] | null;
    const b = Array.isArray(budgets) ? budgets[0] : budgets;
    resolvedOrgId = b?.org_id;
  }

  if (!resolvedOrgId) {
    return NextResponse.json({ error: "orgId or budgetId required" }, { status: 400 });
  }

  const write = await budgetWriteClient(user.id, resolvedOrgId);
  if (!write.ok) return write.response;
  const { db } = write;

  if (action === "archive" && budgetId) {
    const { error } = await db
      .from("budgets")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", budgetId)
      .eq("org_id", resolvedOrgId);
    if (isMissingBudgetArchiveColumn(error)) {
      return NextResponse.json({ error: BUDGET_ARCHIVE_MIGRATION_HINT }, { status: 503 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: full } = await db.from("budgets").select("*, budget_lines(*)").eq("id", budgetId).single();
    return NextResponse.json(full ? normalizeBudgetRecord(full as Record<string, unknown>) : { archived: true });
  }

  if (action === "restore" && budgetId) {
    const { error } = await db
      .from("budgets")
      .update({ archived_at: null })
      .eq("id", budgetId)
      .eq("org_id", resolvedOrgId);
    if (isMissingBudgetArchiveColumn(error)) {
      return NextResponse.json({ error: BUDGET_ARCHIVE_MIGRATION_HINT }, { status: 503 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: full } = await db.from("budgets").select("*, budget_lines(*)").eq("id", budgetId).single();
    return NextResponse.json(full ? normalizeBudgetRecord(full as Record<string, unknown>) : { restored: true });
  }

  if (action === "delete_budget" && budgetId) {
    const { error } = await db.from("budgets").delete().eq("id", budgetId).eq("org_id", resolvedOrgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("audit_logs").insert({
      org_id: resolvedOrgId,
      actor_id: user.id,
      action: "budget_deleted",
      resource_type: "budgets",
      resource_id: budgetId,
    });
    return NextResponse.json({ deleted: true, budgetId });
  }

  if (action === "delete" && lineId) {
    const { error } = await db.from("budget_lines").delete().eq("id", lineId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  if (action === "add" && budgetId) {
    const { data, error } = await db.from("budget_lines").insert({
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
    const { data, error } = await db.from("budget_lines").update(lineUpdates).eq("id", lineId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (budgetId) {
    const budgetUpdates: Record<string, unknown> = { ...updates };
    if (label !== undefined) budgetUpdates.label = label;
    const { data, error } = await db.from("budgets").update(budgetUpdates).eq("id", budgetId).eq("org_id", resolvedOrgId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "budgetId or lineId required" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const budgetId = searchParams.get("budget_id");
  const orgId = searchParams.get("org_id");
  if (!budgetId || !orgId) {
    return NextResponse.json({ error: "budget_id and org_id required" }, { status: 400 });
  }

  const write = await budgetWriteClient(user.id, orgId);
  if (!write.ok) return write.response;

  const { error } = await write.db.from("budgets").delete().eq("id", budgetId).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await write.db.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "budget_deleted",
    resource_type: "budgets",
    resource_id: budgetId,
  });

  return NextResponse.json({ deleted: true, budgetId });
}
