import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/** Client-side Stripe.js — uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY only. */
export function getStripeClient(): Promise<Stripe | null> {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) return Promise.resolve(null);
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
