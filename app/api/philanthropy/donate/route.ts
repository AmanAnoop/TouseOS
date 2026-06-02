import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServiceClient();
  const body = await request.json();
  const { campaignId, amount, donorName, donorEmail, message, isAnonymous } = body;

  if (!campaignId || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "campaignId and positive amount required" }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("philanthropy_campaigns")
    .select("id, org_id, raised_amount, is_active")
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.is_active) {
    return NextResponse.json({ error: "Campaign not found or inactive" }, { status: 404 });
  }

  const donationAmount = Number(amount);

  const { data: donation, error } = await supabase.from("donations").insert({
    campaign_id: campaignId,
    org_id: campaign.org_id,
    donor_name: isAnonymous ? "Anonymous" : (donorName ?? "Guest"),
    donor_email: donorEmail ?? null,
    amount: donationAmount,
    message: message ?? null,
    is_anonymous: Boolean(isAnonymous),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newRaised = Number(campaign.raised_amount ?? 0) + donationAmount;
  await supabase
    .from("philanthropy_campaigns")
    .update({ raised_amount: newRaised })
    .eq("id", campaignId);

  return NextResponse.json({ donation, raisedAmount: newRaised }, { status: 201 });
}
