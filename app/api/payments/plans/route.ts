import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: payments } = await supabase
    .from("payments")
    .select("id")
    .eq("org_id", orgId);

  const paymentIds = (payments ?? []).map((p) => p.id);
  if (paymentIds.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("payment_plans")
    .select("*, payments(id, amount, paid_amount, status, due_date, member_profiles(full_name, email))")
    .in("payment_id", paymentIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, installments } = await request.json();
  if (!paymentId || !installments) {
    return NextResponse.json({ error: "paymentId and installments required" }, { status: 400 });
  }

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .select("id, org_id, amount, paid_amount, status, due_date")
    .eq("id", paymentId)
    .single();

  if (payErr || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ error: "Payment already paid" }, { status: 400 });

  const remaining = Number(payment.amount) - Number(payment.paid_amount);
  const count = Math.min(Math.max(parseInt(String(installments), 10), 2), 6);
  const installmentAmount = Math.round((remaining / count) * 100) / 100;

  const baseDate = payment.due_date ? new Date(payment.due_date) : new Date();
  const schedule = Array.from({ length: count }, (_, i) => {
    const due = new Date(baseDate);
    due.setMonth(due.getMonth() + i);
    return {
      installment: i + 1,
      due_date: due.toISOString().slice(0, 10),
      amount: i === count - 1
        ? Math.round((remaining - installmentAmount * (count - 1)) * 100) / 100
        : installmentAmount,
      status: "pending",
    };
  });

  const { data, error } = await supabase.from("payment_plans").insert({
    payment_id: paymentId,
    installments: count,
    installment_amount: installmentAmount,
    schedule,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: payment.org_id,
    actor_id: user.id,
    action: "payment_plan_created",
    resource_type: "payment_plans",
    resource_id: data.id,
    metadata: { payment_id: paymentId, installments: count },
  });

  return NextResponse.json(data, { status: 201 });
}
