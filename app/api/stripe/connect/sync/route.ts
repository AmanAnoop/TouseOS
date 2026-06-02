import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";
import { syncOrgStripeConnectSettings } from "@/lib/stripe-connect-sync";

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
    .select("stripe_account_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_account_id) {
    return NextResponse.json({ error: "No Stripe account linked" }, { status: 400 });
  }

  const status = await syncOrgStripeConnectSettings(supabase, orgId, org.stripe_account_id);

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
