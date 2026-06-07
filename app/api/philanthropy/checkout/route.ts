import { NextResponse } from "next/server";
import { createPhilanthropyCheckout } from "@/lib/stripe";
import { requireChapterStripeForCheckout } from "@/lib/stripe-connect-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/integrations";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const supabase = await createServiceClient();
  const body = await request.json();
  const { campaignId, amount, donorName, donorEmail, message, isAnonymous } = body;

  if (!campaignId || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "campaignId and positive amount required" }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("philanthropy_campaigns")
    .select("id, org_id, title, is_active, public_page_slug")
    .eq("id", campaignId)
    .single();

  if (!campaign?.is_active || !campaign.public_page_slug) {
    return NextResponse.json({ error: "Campaign not found or inactive" }, { status: 404 });
  }

  try {
    const connect = await requireChapterStripeForCheckout(supabase, campaign.org_id);
    if (!connect.ok) {
      return NextResponse.json({ error: connect.error, code: "stripe_connect_required" }, { status: 403 });
    }

    const session = await createPhilanthropyCheckout({
      campaignId: campaign.id,
      orgId: campaign.org_id,
      campaignTitle: campaign.title,
      amount: Number(amount),
      slug: campaign.public_page_slug,
      donorName,
      donorEmail,
      message,
      isAnonymous: Boolean(isAnonymous),
      connectedAccountId: connect.accountId,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
