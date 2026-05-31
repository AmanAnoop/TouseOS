import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, paymentIds } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  let query = supabase
    .from("payments")
    .select("id, amount, paid_amount, status, member_profiles(full_name, email)")
    .eq("org_id", orgId)
    .in("status", ["pending", "overdue", "partial"]);

  if (paymentIds?.length) query = query.in("id", paymentIds);

  const { data: payments } = await query;
  const reminded = (payments ?? []).length;

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "payment_reminders_sent",
    resource_type: "payments",
    metadata: { count: reminded, payment_ids: (payments ?? []).map((p: { id: string }) => p.id) },
  });

  // Create in-app notifications for members with user accounts
  for (const p of payments ?? []) {
    const mp = p.member_profiles as { full_name?: string; email?: string } | null;
    if (!mp?.email) continue;
    const { data: profile } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("email", mp.email)
      .maybeSingle();
    if (profile?.user_id) {
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        org_id: orgId,
        type: "payment_reminder",
        title: "Payment reminder",
        body: `You have an outstanding balance of $${(Number(p.amount) - Number(p.paid_amount)).toFixed(2)}. Please pay at your earliest convenience.`,
        link: "/payments",
      });
    }
  }

  return NextResponse.json({
    reminded,
    message: reminded > 0
      ? `Sent ${reminded} payment reminder${reminded > 1 ? "s" : ""} (in-app notifications).`
      : "No outstanding payments to remind.",
  });
}
