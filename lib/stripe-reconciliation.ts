import { stripe } from "@/lib/stripe";

export type ReconciliationRow = {
  paymentId: string;
  memberName: string | null;
  recordedCents: number;
  stripeCents: number | null;
  status: "matched" | "mismatch" | "stripe_error" | "missing_intent";
  stripePaymentIntentId: string | null;
  applicationFeeCents: number | null;
  destinationAccount: string | null;
  paidAt: string | null;
};

export type ReconciliationSummary = {
  rows: ReconciliationRow[];
  matched: number;
  mismatch: number;
  stripeErrors: number;
  missingIntent: number;
  totalRecordedCents: number;
  totalStripeCents: number;
  totalApplicationFeeCents: number;
  connectedAccountId: string | null;
};

type PaymentRow = {
  id: string;
  paid_amount: number | string | null;
  amount: number | string | null;
  status: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  member_profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

function memberName(mp: PaymentRow["member_profiles"]): string | null {
  if (!mp) return null;
  if (Array.isArray(mp)) return mp[0]?.full_name ? String(mp[0].full_name) : null;
  return mp.full_name ? String(mp.full_name) : null;
}

export async function reconcileStripePayments(
  payments: PaymentRow[],
  connectedAccountId: string | null,
): Promise<ReconciliationSummary> {
  const rows: ReconciliationRow[] = [];
  let matched = 0;
  let mismatch = 0;
  let stripeErrors = 0;
  let missingIntent = 0;
  let totalRecordedCents = 0;
  let totalStripeCents = 0;
  let totalApplicationFeeCents = 0;

  const stripePaid = payments.filter((p) => p.status === "paid" || Number(p.paid_amount) > 0);

  for (const p of stripePaid.slice(0, 60)) {
    const recordedCents = Math.round(Number(p.paid_amount || p.amount || 0) * 100);
    totalRecordedCents += recordedCents;

    if (!p.stripe_payment_intent_id) {
      missingIntent += 1;
      rows.push({
        paymentId: String(p.id),
        memberName: memberName(p.member_profiles),
        recordedCents,
        stripeCents: null,
        status: "missing_intent",
        stripePaymentIntentId: null,
        applicationFeeCents: null,
        destinationAccount: connectedAccountId,
        paidAt: p.paid_at,
      });
      continue;
    }

    try {
      const pi = await stripe.paymentIntents.retrieve(p.stripe_payment_intent_id);
      const stripeCents = pi.amount_received ?? 0;
      totalStripeCents += stripeCents;

      let applicationFeeCents: number | null = null;
      const dest =
        typeof pi.transfer_data?.destination === "string"
          ? pi.transfer_data.destination
          : connectedAccountId;

      if (pi.latest_charge) {
        const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        if (charge.application_fee_amount != null) {
          applicationFeeCents = charge.application_fee_amount;
          totalApplicationFeeCents += applicationFeeCents;
        }
      }

      const ok = Math.abs(stripeCents - recordedCents) <= 1;
      if (ok) matched += 1;
      else mismatch += 1;

      rows.push({
        paymentId: String(p.id),
        memberName: memberName(p.member_profiles),
        recordedCents,
        stripeCents,
        status: ok ? "matched" : "mismatch",
        stripePaymentIntentId: p.stripe_payment_intent_id,
        applicationFeeCents,
        destinationAccount: dest,
        paidAt: p.paid_at,
      });
    } catch {
      stripeErrors += 1;
      rows.push({
        paymentId: String(p.id),
        memberName: memberName(p.member_profiles),
        recordedCents,
        stripeCents: null,
        status: "stripe_error",
        stripePaymentIntentId: p.stripe_payment_intent_id,
        applicationFeeCents: null,
        destinationAccount: connectedAccountId,
        paidAt: p.paid_at,
      });
    }
  }

  return {
    rows,
    matched,
    mismatch,
    stripeErrors,
    missingIntent,
    totalRecordedCents,
    totalStripeCents,
    totalApplicationFeeCents,
    connectedAccountId,
  };
}
