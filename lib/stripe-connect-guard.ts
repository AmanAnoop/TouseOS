import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgStripeDestination } from "@/lib/org-stripe";
import { getConnectAccountStatus } from "@/lib/stripe-connect";

export const STRIPE_CONNECT_REQUIRED_MESSAGE =
  "Online dues are disabled until your chapter connects Stripe. Treasurer: Settings → Integrations → Stripe Connect.";

export const STRIPE_CONNECT_INCOMPLETE_MESSAGE =
  "Chapter Stripe onboarding is incomplete. Treasurer must finish setup in Settings → Integrations.";

/** Chapter must have Connect with charges enabled before card checkout. */
export async function requireChapterStripeForCheckout(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const accountId = await getOrgStripeDestination(supabase, orgId);
  if (!accountId) {
    return { ok: false, error: STRIPE_CONNECT_REQUIRED_MESSAGE };
  }

  try {
    const status = await getConnectAccountStatus(accountId);
    if (!status.chargesEnabled) {
      return { ok: false, error: STRIPE_CONNECT_INCOMPLETE_MESSAGE };
    }
    return { ok: true, accountId };
  } catch {
    return { ok: false, error: STRIPE_CONNECT_REQUIRED_MESSAGE };
  }
}
