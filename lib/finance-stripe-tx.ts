import type { SupabaseClient } from "@supabase/supabase-js";

/** Record a Stripe dues payment in the unified finance feed. */
export async function recordStripeFinanceTransaction(
  supabase: SupabaseClient,
  opts: {
    orgId: string;
    paymentId: string;
    memberId?: string | null;
    amount: number;
    description: string;
    paymentIntentId?: string | null;
    status?: string;
  },
) {
  const idempotencyKey = opts.paymentIntentId
    ? `stripe:pi:${opts.paymentIntentId}`
    : `stripe:pay:${opts.paymentId}:${opts.amount}`;

  await supabase.from("finance_transactions").upsert(
    {
      org_id: opts.orgId,
      source: "stripe",
      external_id: opts.paymentIntentId ?? opts.paymentId,
      occurred_at: new Date().toISOString(),
      amount: opts.amount,
      description: opts.description,
      merchant_name: "Stripe — dues",
      category_key: "dues_income",
      payment_id: opts.paymentId,
      member_id: opts.memberId ?? null,
      status: opts.status ?? "posted",
      pending_review: false,
      idempotency_key: idempotencyKey,
    },
    { onConflict: "org_id,idempotency_key" },
  );
}
