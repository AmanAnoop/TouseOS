import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFinanceLedger, normalizePaymentsForLedger } from "@/lib/budget-sync";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const [paymentsRes, campaignsRes, reimbsRes] = await Promise.all([
    supabase.from("payments").select("id, amount, paid_amount, status, payment_items(category, title)").eq("org_id", orgId),
    supabase.from("philanthropy_campaigns").select("raised_amount").eq("org_id", orgId),
    supabase.from("reimbursements").select("id, amount, status, category").eq("org_id", orgId),
  ]);

  const philanthropyRaised = (campaignsRes.data ?? []).reduce(
    (s, c) => s + Number(c.raised_amount ?? 0),
    0,
  );

  const ledger = buildFinanceLedger(
    normalizePaymentsForLedger(paymentsRes.data ?? []),
    reimbsRes.data ?? [],
    philanthropyRaised,
  );

  return NextResponse.json({
    ledger,
    sources: {
      payments: "/payments",
      reimbursements: "/reimbursements",
      housing: "/housing",
    },
  });
}
