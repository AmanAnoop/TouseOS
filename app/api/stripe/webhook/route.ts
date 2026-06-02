import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

function getUserIdFromMemberProfiles(mp: unknown): string | null {
  if (!mp) return null;
  if (Array.isArray(mp)) {
    const first = mp[0] as Record<string, unknown> | undefined;
    const uid = first?.user_id;
    return typeof uid === "string" ? uid : null;
  }
  const obj = mp as Record<string, unknown>;
  const uid = obj.user_id;
  return typeof uid === "string" ? uid : null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = await constructWebhookEvent(body, sig);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const paymentId = session.metadata?.paymentId;

    if (paymentId) {
      let receiptUrl: string | null = null;
      try {
        if (session.payment_intent) {
          const charges = await stripe.charges.list({ payment_intent: String(session.payment_intent), limit: 1 });
          const charge = charges.data?.[0];
          receiptUrl = (charge as unknown as { receipt_url?: string | null })?.receipt_url ?? null;
        }
      } catch {
        /* non-fatal */
      }

      const { data: updatedPayment } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_amount: (session.amount_total ?? 0) / 100,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
          receipt_url: receiptUrl,
        })
        .eq("id", paymentId)
        .select("id, org_id, member_profiles(user_id, full_name)")
        .single();

      if (updatedPayment) {
        const mp = (updatedPayment as unknown as { member_profiles?: unknown }).member_profiles;
        const payUserId = getUserIdFromMemberProfiles(mp);
        if (payUserId) {
          await createNotification(supabase, {
            userId: payUserId,
            orgId: updatedPayment.org_id,
            type: "payment_received",
            title: "Payment received",
            body: receiptUrl ? "Thanks! Your receipt is available." : "Thanks! Your payment was recorded.",
            link: "/payments",
          });
        }
      }

      await supabase.from("audit_logs").insert({
        org_id: session.metadata?.orgId,
        action: "payment_received",
        resource_type: "payments",
        resource_id: paymentId,
        metadata: { amount: session.amount_total, session_id: session.id },
      });
    }

    if (session.metadata?.type === "philanthropy" && session.metadata?.campaignId) {
      const campaignId = session.metadata.campaignId;
      const orgId = session.metadata.orgId;
      const paymentIntentId = session.payment_intent ? String(session.payment_intent) : session.id;
      const donationAmount = (session.amount_total ?? 0) / 100;

      if (donationAmount > 0) {
        const { data: existing } = await supabase
          .from("donations")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (!existing) {
          const { data: campaign } = await supabase
            .from("philanthropy_campaigns")
            .select("raised_amount")
            .eq("id", campaignId)
            .single();

          const isAnonymous = session.metadata.isAnonymous === "true";
          await supabase.from("donations").insert({
            campaign_id: campaignId,
            org_id: orgId,
            donor_name: session.metadata.donorName ?? "Guest",
            donor_email: session.metadata.donorEmail || null,
            amount: donationAmount,
            message: session.metadata.message || null,
            is_anonymous: isAnonymous,
            stripe_payment_intent_id: paymentIntentId,
          });

          if (campaign) {
            const newRaised = Number(campaign.raised_amount ?? 0) + donationAmount;
            await supabase
              .from("philanthropy_campaigns")
              .update({ raised_amount: newRaised })
              .eq("id", campaignId);
          }

          await supabase.from("audit_logs").insert({
            org_id: orgId,
            action: "donation_received",
            resource_type: "philanthropy_campaigns",
            resource_id: campaignId,
            metadata: { amount: donationAmount, session_id: session.id, stripe: true },
          });
        }
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", intent.id)
      .single();

    if (payment) {
      const { data: updated } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .select("id, org_id, member_profiles(user_id, full_name)")
        .single();

      if (updated) {
        const mp2 = (updated as unknown as { member_profiles?: unknown }).member_profiles;
        const failUserId = getUserIdFromMemberProfiles(mp2);
        if (failUserId) {
          await createNotification(supabase, {
            userId: failUserId,
            orgId: updated.org_id,
            type: "payment_failed",
            title: "Payment failed",
            body: "Your recent payment attempt failed. Please try again or contact your treasurer.",
            link: "/payments",
            sendPush: true,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}