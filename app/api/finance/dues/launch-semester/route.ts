import { NextResponse } from "next/server";
import { requireFinanceOfficer, getServiceDb } from "@/lib/finance-api";
import { getConnectAccountStatus, isStripeConnectEnabled } from "@/lib/stripe-connect";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

export async function POST(request: Request) {
  const body = await request.json();
  const orgId = String(body.orgId ?? "");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const auth = await requireFinanceOfficer(orgId);
  if (!auth.ok) return auth.response;

  const amount = Number(body.amount);
  const dueDate = body.dueDate as string | undefined;
  const title = String(body.title ?? "Semester dues").trim();
  const lateFee = Math.max(0, Number(body.lateFee ?? 0));

  if (!amount || Number.isNaN(amount)) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }

  const { data: org } = await auth.supabase
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", orgId)
    .single();

  if (isStripeConnectEnabled() && org?.stripe_account_id) {
    try {
      const status = await getConnectAccountStatus(org.stripe_account_id);
      if (!status.chargesEnabled || !status.detailsSubmitted) {
        return NextResponse.json({
          error: "Complete Stripe Connect onboarding before collecting dues",
          stripeIncomplete: true,
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Stripe account unavailable" }, { status: 503 });
    }
  }

  const service = await getServiceDb();

  const { data: item, error: itemError } = await service.from("payment_items").insert({
    org_id: orgId,
    title,
    amount,
    category: "dues",
    due_date: dueDate ?? null,
  }).select().single();

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  const { data: members } = await service
    .from("member_profiles")
    .select("id, user_id, full_name")
    .eq("org_id", orgId)
    .in("membership_status", ["active", "new_member"]);

  const rows = (members ?? []).map((m) => ({
    org_id: orgId,
    member_id: m.id,
    payment_item_id: item.id,
    amount,
    paid_amount: 0,
    status: "pending",
    due_date: dueDate ?? null,
    late_fee: lateFee,
  }));

  if (rows.length) {
    const { error: payErr } = await service.from("payments").insert(rows);
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });
  }

  await service.from("finance_org_settings").upsert({
    org_id: orgId,
    semester_dues_amount: amount,
    semester_dues_due_date: dueDate ?? null,
    updated_at: new Date().toISOString(),
  });

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: auth.userId,
    action: "semester_dues_launched",
    resource_type: "payment_items",
    resource_id: item.id,
    metadata: { title, amount, members: rows.length },
  });

  void triggerBudgetSyncForOrg(orgId, auth.userId);

  return NextResponse.json({
    success: true,
    paymentItemId: item.id,
    membersCharged: rows.length,
  }, { status: 201 });
}
