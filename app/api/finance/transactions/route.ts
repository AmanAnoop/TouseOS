import { NextResponse } from "next/server";
import { requireFinanceOfficer } from "@/lib/finance-api";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/finance-categories";

function formatCsvRow(row: Record<string, string | number | null | undefined>) {
  return Object.values(row).map((v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const source = url.searchParams.get("source");
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const exportCsv = url.searchParams.get("export") === "csv";
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));

  let query = auth.supabase
    .from("finance_transactions")
    .select("id, source, external_id, occurred_at, amount, description, merchant_name, category_key, status, pending_review, payment_id, member_id")
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (source && ["plaid", "stripe", "manual"].includes(source)) {
    query = query.eq("source", source);
  }
  if (category) query = query.eq("category_key", category);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data ?? [];
  if (q) {
    rows = rows.filter((r) => {
      const hay = `${r.description ?? ""} ${r.merchant_name ?? ""} ${r.amount}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (exportCsv) {
    const header = ["Date", "Description", "Amount", "Category", "Source", "Status"];
    const lines = rows.map((r) => formatCsvRow({
      Date: r.occurred_at,
      Description: r.merchant_name ?? r.description,
      Amount: r.amount,
      Category: r.category_key,
      Source: r.source,
      Status: r.status,
    }));
    const csv = [header.join(","), ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="finance-${orgId.slice(0, 8)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    transactions: rows,
    categories: DEFAULT_BUDGET_CATEGORIES,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { orgId, transactionId, categoryKey, pendingReview } = body;
  if (!orgId || !transactionId) {
    return NextResponse.json({ error: "orgId and transactionId required" }, { status: 400 });
  }

  const auth = await requireFinanceOfficer(String(orgId));
  if (!auth.ok) return auth.response;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (categoryKey) patch.category_key = categoryKey;
  if (pendingReview != null) patch.pending_review = Boolean(pendingReview);
  if (categoryKey) {
    patch.pending_review = false;
    patch.status = "posted";
  }

  const { data, error } = await auth.supabase
    .from("finance_transactions")
    .update(patch)
    .eq("org_id", orgId)
    .eq("id", transactionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transaction: data });
}
