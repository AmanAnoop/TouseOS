import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnectAccountStatus, isStripeConnectEnabled } from "@/lib/stripe-connect";

export async function POST(request: Request) {
  if (!isStripeConnectEnabled()) {
    return NextResponse.json({ error: "Stripe Connect not enabled" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_account_id, settings")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_account_id) {
    return NextResponse.json({ error: "No Stripe account linked" }, { status: 400 });
  }

  const status = await getConnectAccountStatus(org.stripe_account_id);
  const settings = {
    ...(org.settings as object ?? {}),
    stripe_connect: {
      charges_enabled: status.chargesEnabled,
      details_submitted: status.detailsSubmitted,
      synced_at: new Date().toISOString(),
    },
  };

  await supabase.from("organizations").update({ settings }).eq("id", orgId);

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "stripe_connect_synced",
    resource_type: "organizations",
    resource_id: orgId,
    metadata: status,
  });

  return NextResponse.json({
    ok: true,
    chargesEnabled: status.chargesEnabled,
    detailsSubmitted: status.detailsSubmitted,
  });
}
