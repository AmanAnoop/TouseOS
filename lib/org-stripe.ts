import type { SupabaseClient } from "@supabase/supabase-js";

type OrgStripeRow = {
  stripe_account_id: string | null;
  settings: unknown;
};

/** Connected account ID when chapter Stripe Connect is ready for destination charges. */
export async function getOrgStripeDestination(
  supabase: SupabaseClient,
  orgId: string,
): Promise<string | undefined> {
  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_account_id, settings")
    .eq("id", orgId)
    .single();

  if (!org) return undefined;
  return resolveStripeDestination(org as OrgStripeRow);
}

export function resolveStripeDestination(org: OrgStripeRow): string | undefined {
  const accountId = org.stripe_account_id;
  if (!accountId) return undefined;

  const settings = org.settings as { stripe_connect?: { charges_enabled?: boolean } } | null;
  if (settings?.stripe_connect?.charges_enabled === false) return undefined;

  return accountId;
}
