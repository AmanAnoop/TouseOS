import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeDuesSyncActual } from "@/lib/dues-forecast";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, budgetId } = await request.json();
  if (!orgId || !budgetId) {
    return NextResponse.json({ error: "orgId and budgetId required" }, { status: 400 });
  }

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, org_id, budget_lines(*)")
    .eq("id", budgetId)
    .eq("org_id", orgId)
    .single();

  if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });

  const [paymentsRes, campaignsRes] = await Promise.all([
    supabase.from("payments").select("id, amount, paid_amount, status, category, due_date").eq("org_id", orgId),
    supabase.from("philanthropy_campaigns").select("raised_amount").eq("org_id", orgId),
  ]);

  const payments = paymentsRes.data ?? [];
  const duesActual = computeDuesSyncActual(payments);
  const philanthropyActual = (campaignsRes.data ?? []).reduce(
    (s, c) => s + Number(c.raised_amount ?? 0),
    0,
  );

  const lines = (budget.budget_lines ?? []) as Array<{
    id: string;
    category: string;
    type: string;
    actual: number;
  }>;

  const updates: Array<{ lineId: string; category: string; previous: number; next: number }> = [];

  async function upsertLine(
    category: string,
    type: "income" | "expense",
    actual: number,
    description: string,
  ) {
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
        .select("id, category, actual")
        .single();
      if (created) {
        updates.push({ lineId: created.id, category, previous: 0, next: actual });
      }
      return;
    }
    const previous = Number(line.actual ?? 0);
    if (previous !== actual) {
      await supabase.from("budget_lines").update({ actual }).eq("id", line.id);
      updates.push({ lineId: line.id, category, previous, next: actual });
    }
  }

  await upsertLine("Dues income", "income", duesActual, "Synced from payments");
  if (philanthropyActual > 0) {
    await upsertLine("Donations", "income", philanthropyActual, "Synced from philanthropy campaigns");
  }

  const reimbTotal = (await supabase
    .from("reimbursements")
    .select("amount")
    .eq("org_id", orgId)
    .eq("status", "paid")).data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  if (reimbTotal > 0) {
    await upsertLine("Miscellaneous", "expense", reimbTotal, "Synced from paid reimbursements");
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "budget_synced",
    resource_type: "budgets",
    resource_id: budgetId,
    metadata: { updates },
  });

  const { data: refreshed } = await supabase
    .from("budgets")
    .select("*, budget_lines(*)")
    .eq("id", budgetId)
    .single();

  return NextResponse.json({
    budget: refreshed,
    updates,
    summary: {
      duesCollected: duesActual,
      philanthropyRaised: philanthropyActual,
      reimbursementsPaid: reimbTotal,
    },
  });
}
