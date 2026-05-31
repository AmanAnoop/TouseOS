import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

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

  if (lines?.length) {
    const lineRows = lines.map((l: Record<string, unknown>) => ({
      budget_id: budget.id,
      category: l.category,
      type: l.type,
      description: l.description || null,
      budgeted: parseFloat(String(l.budgeted ?? "0")),
      actual: parseFloat(String(l.actual ?? "0")),
    }));
    await supabase.from("budget_lines").insert(lineRows);
  }

  return NextResponse.json(budget, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { budgetId, lineId, ...updates } = await request.json();

  if (lineId) {
    const { data, error } = await supabase.from("budget_lines").update(updates).eq("id", lineId).select().single();
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
