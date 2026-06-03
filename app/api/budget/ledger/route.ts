import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/api-org-role";
import { can, type RoleName } from "@/lib/permissions";
import { buildFinanceLedger, normalizePaymentsForLedger, PAYMENT_SELECT } from "@/lib/budget-sync";

function canViewBudget(role: RoleName | null): boolean {
  if (!role) return false;
  return can(role, "manage_budget") || can(role, "view_payments") || can(role, "manage_payments");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  if (!role || !canViewBudget(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [paymentsRes, campaignsRes, reimbsRes] = await Promise.all([
    supabase.from("payments").select(PAYMENT_SELECT).eq("org_id", orgId),
    supabase.from("philanthropy_campaigns").select("raised_amount").eq("org_id", orgId),
    supabase.from("reimbursements").select("id, amount, status, category").eq("org_id", orgId),
  ]);

  if (paymentsRes.error) {
    return NextResponse.json({ error: paymentsRes.error.message }, { status: 500 });
  }

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
