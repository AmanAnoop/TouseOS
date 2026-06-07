import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaymentLink } from "@/lib/stripe";
import { requireChapterStripeForCheckout } from "@/lib/stripe-connect-guard";
import {
  computeCheckoutAmount,
  loadPaymentForCheckout,
  memberEmailFromPayment,
  orgNameFromPayment,
  paymentItemTitle,
  type PaymentCheckoutRow,
} from "@/lib/payment-checkout";

function memberFirstName(row: PaymentCheckoutRow): string | undefined {
  const mp = row.member_profiles;
  if (!mp) return undefined;
  const name = Array.isArray(mp) ? mp[0]?.full_name : mp.full_name;
  return name?.split(" ")[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, org_id, amount, paid_amount, status, due_date, late_fee, payment_items(title), member_profiles(full_name), organizations(name)")
    .eq("parent_pay_token", token)
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const row = payment as PaymentCheckoutRow;

  if (payment.status === "paid") {
    return NextResponse.json({
      paid: true,
      orgName: orgNameFromPayment(row),
      memberName: memberFirstName(row),
    });
  }

  const connect = await requireChapterStripeForCheckout(supabase, payment.org_id);

  return NextResponse.json({
    paid: false,
    paymentId: payment.id,
    orgName: orgNameFromPayment(row),
    title: paymentItemTitle(row),
    memberName: memberFirstName(row),
    amount: Number(payment.amount),
    paidAmount: Number(payment.paid_amount),
    checkoutAmount: computeCheckoutAmount(row),
    dueDate: payment.due_date,
    status: payment.status,
    stripeReady: connect.ok,
    stripeMessage: connect.ok ? undefined : connect.error,
  });
}

export async function POST(request: Request) {
  const { token, email } = await request.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id")
    .eq("parent_pay_token", token)
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { data: full, error: loadErr } = await loadPaymentForCheckout(supabase, payment.id, token);
  if (loadErr || !full) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const row = full as PaymentCheckoutRow;
  const checkoutAmount = computeCheckoutAmount(row);
  if (checkoutAmount <= 0) {
    return NextResponse.json({ error: "Nothing due on this payment" }, { status: 400 });
  }

  const connect = await requireChapterStripeForCheckout(supabase, full.org_id);
  if (!connect.ok) {
    return NextResponse.json(
      { error: connect.error, code: "stripe_connect_required", stripeReady: false },
      { status: 403 },
    );
  }

  const session = await createPaymentLink({
    amount: checkoutAmount,
    description: paymentItemTitle(row),
    orgName: orgNameFromPayment(row),
    memberEmail: email ?? memberEmailFromPayment(row),
    metadata: { paymentId: payment.id, orgId: full.org_id, parentPay: "true" },
    connectedAccountId: connect.accountId,
  });

  await supabase
    .from("payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", payment.id);

  return NextResponse.json({ url: session.url });
}
