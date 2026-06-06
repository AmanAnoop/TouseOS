import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { sendBulkEmail, textToHtml } from "@/lib/email";
import { can, type RoleName } from "@/lib/permissions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    orgId, paymentIds, body, audience, memberId,
    includeHardship = true, includePaymentPlans = true,
  } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("payments")
    .select("id, amount, paid_amount, status, member_id, member_profiles(full_name, email)")
    .eq("org_id", orgId);

  if (paymentIds?.length) {
    query = query.in("id", paymentIds);
  } else if (audience === "overdue_only") {
    query = query.eq("status", "overdue");
  } else if (audience === "individual" && memberId) {
    query = query.eq("member_id", memberId).in("status", ["pending", "overdue", "partial"]);
  } else {
    query = query.in("status", ["pending", "overdue", "partial"]);
  }

  const { data: payments } = await query;

  let filtered = payments ?? [];

  if (!includeHardship) {
    const { data: hardship } = await supabase
      .from("hardship_requests")
      .select("member_id")
      .eq("org_id", orgId)
      .eq("status", "pending");
    const exclude = new Set((hardship ?? []).map((h) => h.member_id).filter(Boolean));
    filtered = filtered.filter((p) => !exclude.has(p.member_id));
  }

  if (!includePaymentPlans) {
    const paymentIdList = filtered.map((p) => p.id);
    if (paymentIdList.length) {
      const { data: plans } = await supabase
        .from("payment_plans")
        .select("payment_id")
        .in("payment_id", paymentIdList);
      const onPlan = new Set((plans ?? []).map((pl) => pl.payment_id));
      filtered = filtered.filter((p) => !onPlan.has(p.id));
    }
  }

  const reminded = filtered.length;
  const messageBody = typeof body === "string" && body.trim()
    ? body.trim()
    : "You have an outstanding balance on TouseOS. Please sign in to review and pay at your earliest convenience.";

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "payment_reminders_sent",
    resource_type: "payments",
    metadata: { count: reminded, audience: audience ?? "all_unpaid" },
  });

  const serviceSupabase = await createServiceClient();
  let pushSent = 0;
  const emailSet = new Set<string>();

  for (const p of filtered) {
    const mp = p.member_profiles as { full_name?: string; email?: string } | null;
    if (!mp?.email) continue;
    const { data: profile } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("email", mp.email)
      .maybeSingle();
    if (profile?.user_id) {
      const balance = (Number(p.amount) - Number(p.paid_amount)).toFixed(2);
      const { error } = await createNotification(serviceSupabase, {
        userId: profile.user_id,
        orgId,
        type: "payment_reminder",
        title: "Payment reminder",
        body: `${messageBody} Balance: $${balance}.`,
        link: "/payments",
      });
      if (!error) pushSent++;
      emailSet.add(mp.email);
    }
  }

  let emailsSent = 0;
  if (emailSet.size > 0) {
    const result = await sendBulkEmail({
      to: [...emailSet],
      subject: "Payment reminder from your chapter",
      html: textToHtml(messageBody),
    });
    emailsSent = result.sent;
  }

  return NextResponse.json({
    reminded,
    pushSent,
    emailsSent,
    message: reminded > 0
      ? `Sent ${reminded} reminder${reminded > 1 ? "s" : ""} (in-app, ${emailsSent} email${emailsSent !== 1 ? "s" : ""}, push where enabled).`
      : "No outstanding payments to remind.",
  });
}
