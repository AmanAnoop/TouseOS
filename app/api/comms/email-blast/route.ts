import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAudienceMembers, sendBulkEmail, textToHtml } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, subject, body, audience } = await request.json();
  if (!orgId || !subject || !body) {
    return NextResponse.json({ error: "orgId, subject, and body are required" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const members = await getAudienceMembers(supabase, orgId, audience ?? "all");
  const emails = members.map((m) => m.email);

  const html = textToHtml(body);
  const result = await sendBulkEmail({ to: emails, subject, html });

  await supabase.from("announcements").insert({
    org_id: orgId,
    author_id: user.id,
    author_name: String(profile?.full_name ?? "Officer"),
    title: `📧 Email blast: ${subject}`,
    body,
    audience: [audience ?? "all"],
    pinned: false,
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    actor_name: String(profile?.full_name ?? "Officer"),
    action: "email_blast_sent",
    resource_type: "announcements",
    metadata: {
      subject,
      audience,
      recipient_count: emails.length,
      sent: result.sent,
      mode: result.mode,
    },
  });

  const message = result.mode === "live"
    ? `Sent ${result.sent} email${result.sent !== 1 ? "s" : ""} via Resend.`
    : `Email blast logged for ${emails.length} recipients. Add RESEND_API_KEY and RESEND_FROM_EMAIL to send live emails.`;

  return NextResponse.json({
    success: true,
    recipientCount: emails.length,
    sent: result.sent,
    mode: result.mode,
    message,
  });
}
