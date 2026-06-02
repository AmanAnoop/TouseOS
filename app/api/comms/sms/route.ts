import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAudienceMembers, sendBulkEmail, textToHtml } from "@/lib/email";
import { sendMassSms, isWithinQuietHours } from "@/lib/twilio";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, body, audience = "active", channel = "sms" } = await request.json();
  if (!orgId || !body?.trim()) {
    return NextResponse.json({ error: "orgId and body required" }, { status: 400 });
  }

  if (channel === "sms") {
    if (isWithinQuietHours(new Date())) {
      return NextResponse.json({ error: "Quiet hours (9pm–9am). Try again later." }, { status: 429 });
    }

    const { data: members } = await supabase
      .from("member_profiles")
      .select("full_name, phone")
      .eq("org_id", orgId)
      .eq("membership_status", "active")
      .not("phone", "is", null);

    const recipients = (members ?? [])
      .filter((m: { phone: string | null }) => m.phone)
      .map((m: { phone: string; full_name: string }) => ({ phone: m.phone, name: m.full_name }));

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No members with phone numbers on file" }, { status: 400 });
    }

    const results = await sendMassSms(recipients, body.trim());
    const sent = results.filter((r) => r.status !== "failed" && !r.error).length;
    const failed = results.length - sent;

    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user.id,
      action: "org_sms_broadcast",
      resource_type: "comms",
      metadata: { recipient_count: recipients.length, sent, failed },
    });

    return NextResponse.json({
      sent,
      failed,
      message: sent > 0 ? `Sent ${sent} SMS messages` : "SMS not configured or all failed",
    });
  }

  const members = await getAudienceMembers(supabase, orgId, audience);
  const emails = members.map((m) => m.email);
  const result = await sendBulkEmail({
    to: emails,
    subject: "Message from your chapter",
    html: textToHtml(body.trim()),
  });

  return NextResponse.json({
    sent: result.sent,
    mode: result.mode,
    message: result.mode === "live" ? `Emailed ${result.sent} members` : "Logged (set RESEND_API_KEY for live email)",
  });
}
