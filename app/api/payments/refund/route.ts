import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, orgId, amount, reason, stripeRefund } = await request.json();
  if (!paymentId || !orgId) {
    return NextResponse.json({ error: "paymentId and orgId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, org_id, amount, paid_amount, status, stripe_payment_intent_id")
    .eq("id", paymentId)
    .eq("org_id", orgId)
    .single();

  if (error || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const refundAmount = amount != null
    ? Math.min(Number(amount), Number(payment.paid_amount))
    : Number(payment.paid_amount);

  if (refundAmount <= 0) {
    return NextResponse.json({ error: "No paid amount to refund" }, { status: 400 });
  }

  if (stripeRefund && payment.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: Math.round(refundAmount * 100),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Stripe refund failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const newPaid = Math.max(0, Number(payment.paid_amount) - refundAmount);
  const newStatus = newPaid <= 0 ? "refunded" : "partial";

  const service = await createServiceClient();
  const { data: updated, error: updateErr } = await service
    .from("payments")
    .update({
      paid_amount: newPaid,
      status: newStatus,
      notes: reason ? `Refund: ${reason}` : "Refunded by treasurer",
    })
    .eq("id", paymentId)
    .select("id, paid_amount, status")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "payment_refunded",
    resource_type: "payments",
    resource_id: paymentId,
    metadata: { refundAmount, reason: reason ?? null, stripeRefund: Boolean(stripeRefund) },
  });

  return NextResponse.json({ success: true, payment: updated });
}
