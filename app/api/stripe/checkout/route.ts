import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgStripeDestination } from "@/lib/org-stripe";
import { createPaymentLink } from "@/lib/stripe";
import { requirePlatformFeature } from "@/lib/platform-api-guard";

export async function POST(request: Request) {
  const blocked = await requirePlatformFeature("stripe_payments");
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, email } = await request.json();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, payment_items(title), member_profiles(full_name), organizations(name)")
    .eq("id", paymentId)
    .single();

  if (error || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const remaining = Math.max(0, Number(payment.amount) - Number(payment.paid_amount));
  const duePast = payment.due_date && new Date(payment.due_date) < new Date();
  const applyLateFee =
    payment.status === "overdue" || duePast || payment.status === "partial";
  const lateFee = applyLateFee ? Number(payment.late_fee ?? 0) : 0;
  const connectedAccountId = await getOrgStripeDestination(supabase, payment.org_id);

  const session = await createPaymentLink({
    amount: remaining + lateFee,
    description: (payment.payment_items as Record<string, unknown>)?.title as string ?? "Dues payment",
    orgName: (payment.organizations as Record<string, unknown>)?.name as string ?? "Chapter",
    memberEmail: email,
    metadata: { paymentId, orgId: payment.org_id },
    connectedAccountId,
  });

  // Save session ID to payment record
  await supabase
    .from("payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", paymentId);

  return NextResponse.json({ url: session.url });
}
