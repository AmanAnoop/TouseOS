import Stripe from "stripe";
import { getPlatformSecretSync } from "@/lib/platform-secrets";

function getStripeSecret(): string | undefined {
  return getPlatformSecretSync("STRIPE_SECRET_KEY");
}

let stripeClient: Stripe | null = null;

export function getStripeServer(): Stripe {
  const key = getStripeSecret();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return stripeClient;
}

/** @deprecated Use getStripeServer() */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripeServer(), prop);
  },
});

function applicationFeeAmountCents(totalCents: number): number | undefined {
  const raw = process.env.PLATFORM_STRIPE_APPLICATION_FEE_PERCENT;
  if (!raw) return undefined;
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent <= 0) return undefined;
  return Math.max(0, Math.round(totalCents * (percent / 100)));
}

export async function createPaymentLink(opts: {
  amount: number;
  currency?: string;
  description: string;
  orgName: string;
  memberEmail?: string;
  metadata?: Record<string, string>;
  connectedAccountId?: string;
}) {
  const unitAmount = Math.round(opts.amount * 100);
  const paymentIntentData =
    opts.connectedAccountId
      ? {
          application_fee_amount: applicationFeeAmountCents(unitAmount),
          transfer_data: { destination: opts.connectedAccountId },
        }
      : undefined;

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
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments?cancelled=1`,
    customer_email: opts.memberEmail,
    metadata: {
      ...opts.metadata,
      ...(opts.connectedAccountId ? { stripeDestination: opts.connectedAccountId } : {}),
    },
    ...(paymentIntentData ? { payment_intent_data: paymentIntentData } : {}),
  });

  return session;
}

export async function createPhilanthropyCheckout(opts: {
  campaignId: string;
  orgId: string;
  campaignTitle: string;
  amount: number;
  slug: string;
  donorName?: string;
  donorEmail?: string;
  message?: string;
  isAnonymous?: boolean;
  connectedAccountId?: string;
}) {
  const unitAmount = Math.round(opts.amount * 100);
  const paymentIntentData =
    opts.connectedAccountId
      ? {
          application_fee_amount: applicationFeeAmountCents(unitAmount),
          transfer_data: { destination: opts.connectedAccountId },
        }
      : undefined;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Donation – ${opts.campaignTitle}`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate/${opts.slug}?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate/${opts.slug}?cancelled=1`,
    customer_email: opts.donorEmail || undefined,
    metadata: {
      type: "philanthropy",
      campaignId: opts.campaignId,
      orgId: opts.orgId,
      donorName: opts.isAnonymous ? "Anonymous" : (opts.donorName ?? "Guest"),
      donorEmail: opts.donorEmail ?? "",
      message: opts.message ?? "",
      isAnonymous: opts.isAnonymous ? "true" : "false",
      ...(opts.connectedAccountId ? { stripeDestination: opts.connectedAccountId } : {}),
    },
    ...(paymentIntentData ? { payment_intent_data: paymentIntentData } : {}),
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
  const secret = getPlatformSecretSync("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return stripe.webhooks.constructEvent(body, sig, secret);
}
