import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export async function createPaymentLink(opts: {
  amount: number;
  currency?: string;
  description: string;
  orgName: string;
  memberEmail?: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "us_bank_account"],
    line_items: [
      {
        price_data: {
          currency: opts.currency ?? "usd",
          product_data: {
            name: opts.description,
            metadata: { org: opts.orgName },
          },
          unit_amount: Math.round(opts.amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?cancelled=1`,
    customer_email: opts.memberEmail,
    metadata: opts.metadata,
  });

  return session;
}

export async function createDonationLink(opts: {
  campaignId: string;
  campaignTitle: string;
  orgName: string;
  suggestedAmount?: number;
}) {
  const price = await stripe.prices.create({
    currency: "usd",
    custom_unit_amount: { enabled: true, preset: opts.suggestedAmount ? Math.round(opts.suggestedAmount * 100) : undefined },
    product_data: {
      name: `Donation – ${opts.campaignTitle}`,
      metadata: { campaignId: opts.campaignId },
    },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { campaignId: opts.campaignId },
  });

  return link;
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export async function constructWebhookEvent(body: string, sig: string) {
  return stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
}
