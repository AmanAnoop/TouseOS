import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { sendBulkEmail, textToHtml } from "@/lib/email";

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

  const serviceSupabase = await createServiceClient();
  let pushSent = 0;
  const emailBodies: string[] = [];

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
      const balance = (Number(p.amount) - Number(p.paid_amount)).toFixed(2);
      const { error } = await createNotification(serviceSupabase, {
        userId: profile.user_id,
        orgId,
        type: "payment_reminder",
        title: "Payment reminder",
        body: `You have an outstanding balance of $${balance}. Please pay at your earliest convenience.`,
        link: "/payments",
      });
      if (!error) pushSent++;
      if (mp?.email) {
        emailBodies.push(mp.email);
      }
    }
  }

  const uniqueEmails = [...new Set(emailBodies)];
  let emailsSent = 0;
  if (uniqueEmails.length > 0) {
    const result = await sendBulkEmail({
      to: uniqueEmails,
      subject: "Payment reminder from your chapter",
      html: textToHtml("You have an outstanding balance on TouseOS. Please sign in to review and pay at your earliest convenience."),
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
