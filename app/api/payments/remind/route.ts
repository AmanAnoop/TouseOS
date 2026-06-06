import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { sendBulkEmail, textToHtml } from "@/lib/email";

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
    sendVia = "both",
    includeHardship = true,
    includePaymentPlans = true,
  } = await request.json();

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  let query = supabase
    .from("payments")
    .select("id, amount, paid_amount, status, member_id, member_profiles(full_name, email)")
    .eq("org_id", orgId)
    .in("status", ["pending", "overdue", "partial"]);

  if (paymentIds?.length) query = query.in("id", paymentIds);

  if (audience === "individual" && memberId) {
    query = query.eq("member_id", memberId);
  } else if (audience === "individual" && Array.isArray(memberIds) && memberIds.length > 0) {
    query = query.in("member_id", memberIds);
  } else if (audience === "overdue_only") {
    query = query.eq("status", "overdue");
  }

  const { data: payments } = await query;

  let filtered = payments ?? [];

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
    const { data: planMembers } = await supabase
      .from("payment_plans")
      .select("member_id")
      .eq("org_id", orgId)
      .eq("status", "active");
    const planIds = new Set((planMembers ?? []).map((p) => p.member_id));
    filtered = filtered.filter((p) => !planIds.has(p.member_id));
  }

  const reminded = filtered.length;
  const messageBody = customBody?.trim()
    || "You have an outstanding balance on TouseOS. Please sign in to review and pay at your earliest convenience.";

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "payment_reminders_sent",
    resource_type: "payments",
    metadata: {
      count: reminded,
      audience,
      payment_ids: filtered.map((p: { id: string }) => p.id),
    },
  });

  const serviceSupabase = await createServiceClient();
  let pushSent = 0;
  const emailBodies: string[] = [];
  const sendInApp = sendVia === "in_app" || sendVia === "both";
  const sendEmail = sendVia === "email" || sendVia === "both";

  for (const p of filtered) {
    const mp = p.member_profiles as { full_name?: string; email?: string } | null;
    if (!mp?.email) continue;
    const { data: profile } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("email", mp.email)
      .maybeSingle();
    if (profile?.user_id && sendInApp) {
      const balance = (Number(p.amount) - Number(p.paid_amount)).toFixed(2);
      const { error } = await createNotification(serviceSupabase, {
        userId: profile.user_id,
        orgId,
        type: "payment_reminder",
        title: "Payment reminder",
        body: messageBody.includes("$") ? messageBody : `${messageBody} Outstanding balance: $${balance}.`,
        link: "/payments",
      });
      if (!error) pushSent++;
    }
    if (sendEmail && mp.email) emailBodies.push(mp.email);
  }

  const uniqueEmails = [...new Set(emailBodies)];
  let emailsSent = 0;
  if (sendEmail && uniqueEmails.length > 0) {
    const result = await sendBulkEmail({
      to: uniqueEmails,
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
