import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { sendBulkEmail, textToHtml } from "@/lib/email";
import { sendSms } from "@/lib/twilio";
import { personalizeReminderMessage } from "@/lib/reminder-personalize";

type PaymentRow = {
  id: string;
  amount: number;
  paid_amount: number;
  status: string;
  member_id: string;
  due_date?: string | null;
  member_profiles: { full_name?: string; email?: string; phone?: string | null } | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    orgId,
    paymentIds,
    body: customBody,
    audience = "all_unpaid",
    memberId,
    memberIds,
    memberMessages,
    sendVia = "both",
    includeHardship = true,
    includePaymentPlans = true,
  } = await request.json();

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const defaultBody = customBody?.trim()
    || "Hi [First Name], this is a reminder that your dues of $[Amount] are due on [Date]. Please sign in to TouseOS to make a payment.";

  let query = supabase
    .from("payments")
    .select("id, amount, paid_amount, status, member_id, due_date, member_profiles(full_name, email, phone)")
    .eq("org_id", orgId);

  if (paymentIds?.length) {
    query = query.in("id", paymentIds);
  } else if (audience === "all_members") {
    query = query.in("status", ["pending", "overdue", "partial", "paid"]);
  } else if (audience === "overdue_only") {
    query = query.eq("status", "overdue");
  } else {
    query = query.in("status", ["pending", "overdue", "partial"]);
  }

  if (audience === "individual" && memberId) {
    query = query.eq("member_id", memberId);
  } else if (audience === "individual" && Array.isArray(memberIds) && memberIds.length > 0) {
    query = query.in("member_id", memberIds);
  }

  const { data: payments } = await query;
  let filtered = (payments ?? []) as PaymentRow[];

  if (!includeHardship) {
    const { data: hardshipMembers } = await supabase
      .from("hardship_requests")
      .select("member_id")
      .eq("org_id", orgId)
      .eq("status", "approved");
    const hardshipIds = new Set((hardshipMembers ?? []).map((h) => h.member_id));
    filtered = filtered.filter((p) => !hardshipIds.has(p.member_id));
  }

  if (!includePaymentPlans) {
    const { data: orgPayments } = await supabase
      .from("payments")
      .select("id, member_id")
      .eq("org_id", orgId)
      .in("status", ["pending", "overdue", "partial"]);

    const orgPaymentIds = (orgPayments ?? []).map((p) => p.id);
    const memberByPaymentId = new Map(
      (orgPayments ?? []).map((p) => [p.id, p.member_id as string]),
    );

    if (orgPaymentIds.length > 0) {
      const { data: plans } = await supabase
        .from("payment_plans")
        .select("payment_id")
        .in("payment_id", orgPaymentIds);

      const planMemberIds = new Set(
        (plans ?? [])
          .map((plan) => memberByPaymentId.get(plan.payment_id))
          .filter((id): id is string => Boolean(id)),
      );
      filtered = filtered.filter((p) => !planMemberIds.has(p.member_id));
    }
  }

  if (audience === "all_unpaid" || audience === "unpaid_only") {
    filtered = filtered.filter((p) => ["pending", "overdue", "partial"].includes(p.status));
  }

  const reminded = filtered.length;
  const overrides = (memberMessages ?? {}) as Record<string, string>;

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "payment_reminders_sent",
    resource_type: "payments",
    metadata: {
      count: reminded,
      audience,
      payment_ids: filtered.map((p) => p.id),
      send_via: sendVia,
    },
  });

  const serviceSupabase = await createServiceClient();
  let pushSent = 0;
  let emailsSent = 0;
  let smsSent = 0;
  const sendInApp = sendVia === "in_app" || sendVia === "both" || sendVia === "all";
  const sendEmail = sendVia === "email" || sendVia === "both" || sendVia === "all";
  const sendText = sendVia === "sms" || sendVia === "all";

  for (const p of filtered) {
    const mp = p.member_profiles;
    if (!mp?.full_name) continue;

    const template = overrides[p.member_id]?.trim() || defaultBody;
    const messageBody = personalizeReminderMessage(template, { full_name: mp.full_name }, p);

    if (sendInApp && mp.email) {
      const { data: profile } = await supabase
        .from("member_profiles")
        .select("user_id")
        .eq("org_id", orgId)
        .eq("email", mp.email)
        .maybeSingle();
      if (profile?.user_id) {
        const { error } = await createNotification(serviceSupabase, {
          userId: profile.user_id,
          orgId,
          type: "payment_reminder",
          title: "Payment reminder",
          body: messageBody,
          link: "/payments",
        });
        if (!error) pushSent++;
      }
    }

    if (sendEmail && mp.email) {
      const result = await sendBulkEmail({
        to: [mp.email],
        subject: "Payment reminder from your chapter",
        html: textToHtml(messageBody),
      });
      emailsSent += result.sent;
    }

    if (sendText && mp.phone) {
      const sms = await sendSms(mp.phone, messageBody);
      if (sms.status !== "failed") smsSent++;
    }
  }

  const parts: string[] = [];
  if (pushSent) parts.push(`${pushSent} in-app`);
  if (emailsSent) parts.push(`${emailsSent} email`);
  if (smsSent) parts.push(`${smsSent} text`);

  return NextResponse.json({
    reminded,
    pushSent,
    emailsSent,
    smsSent,
    message: reminded > 0
      ? `Sent ${reminded} reminder${reminded > 1 ? "s" : ""}${parts.length ? ` (${parts.join(", ")})` : ""}.`
      : "No outstanding payments to remind.",
  });
}
