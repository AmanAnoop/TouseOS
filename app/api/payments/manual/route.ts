import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, paymentId, amount, method, notes } = await request.json();
  if (!orgId || !paymentId || !amount) {
    return NextResponse.json({ error: "orgId, paymentId, and amount required" }, { status: 400 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*, member_profiles(full_name)")
    .eq("id", paymentId)
    .eq("org_id", orgId)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const paidAmount = Number(payment.paid_amount) + Number(amount);
  const totalAmount = Number(payment.amount);
  const status = paidAmount >= totalAmount ? "paid" : "partial";

  const { error } = await supabase.from("payments").update({
    paid_amount: paidAmount,
    status,
    method: method || "cash_check",
    paid_at: status === "paid" ? new Date().toISOString() : payment.paid_at,
    notes: notes || payment.notes,
  }).eq("id", paymentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "manual_payment_logged",
    resource_type: "payments",
    resource_id: paymentId,
    metadata: { amount, method, notes },
  });

  return NextResponse.json({ success: true, paidAmount, status });
}
