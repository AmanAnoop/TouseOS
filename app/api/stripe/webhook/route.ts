import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

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
      await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_amount: (session.amount_total ?? 0) / 100,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", paymentId);

      await supabase.from("audit_logs").insert({
        org_id: session.metadata?.orgId,
        action: "payment_received",
        resource_type: "payments",
        resource_id: paymentId,
        metadata: { amount: session.amount_total, session_id: session.id },
      });
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
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    }
  }

  return NextResponse.json({ received: true });
}
