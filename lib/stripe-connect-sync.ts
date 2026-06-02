import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectAccountStatus } from "@/lib/stripe-connect";

export async function syncOrgStripeConnectSettings(
  supabase: SupabaseClient,
  orgId: string,
  stripeAccountId: string,
) {
  const status = await getConnectAccountStatus(stripeAccountId);
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  const settings = {
    ...(org?.settings as object ?? {}),
    stripe_connect: {
      charges_enabled: status.chargesEnabled,
      payouts_enabled: status.payoutsEnabled,
      details_submitted: status.detailsSubmitted,
      requirements_due: status.requirements,
      synced_at: new Date().toISOString(),
    },
  };

  await supabase.from("organizations").update({ settings }).eq("id", orgId);
  return status;
}
