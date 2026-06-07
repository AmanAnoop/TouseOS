import "server-only";

import { isStripeConfigured } from "@/lib/integrations";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function isStripeConnectEnabled(): boolean {
  return isStripeConfigured() && process.env.STRIPE_CONNECT_ENABLED !== "false";
}

export async function createConnectOnboardingLink(opts: {
  accountId: string;
  orgId: string;
}) {
  const link = await stripe.accountLinks.create({
    account: opts.accountId,
    refresh_url: `${APP_URL}/settings/stripe-return?org_id=${opts.orgId}&refresh=1`,
    return_url: `${APP_URL}/settings/stripe-return?org_id=${opts.orgId}`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createExpressConnectAccount(email: string) {
  return stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { source: "touseos" },
  });
}

export async function getConnectAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements?.currently_due ?? [],
  };
}
