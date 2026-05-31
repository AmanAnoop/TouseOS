import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, subject, body, audience } = await request.json();
  if (!orgId || !subject || !body) {
    return NextResponse.json({ error: "orgId, subject, and body are required" }, { status: 400 });
  }

  // In production, this integrates with an email service (Resend, SendGrid, Postmark, etc.)
  // For now, create an announcement record and log the blast
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data: members } = await supabase
    .from("member_profiles")
    .select("id, email, full_name")
    .eq("org_id", orgId)
    .eq("membership_status", "active")
    .not("email", "is", null);

  const recipientCount = (members ?? []).length;

  // Store email blast record as an announcement
  await supabase.from("announcements").insert({
    org_id: orgId,
    author_id: user.id,
    author_name: String(profile?.full_name ?? "Officer"),
    title: `📧 Email blast: ${subject}`,
    body: body,
    audience: [audience ?? "all"],
    pinned: false,
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    actor_name: String(profile?.full_name ?? "Officer"),
    action: "email_blast_sent",
    resource_type: "announcements",
    metadata: { subject, audience, recipient_count: recipientCount },
  });

  // TODO: In production, iterate members and send via your email provider
  // e.g., Resend: await resend.emails.send({ from, to, subject, html })

  return NextResponse.json({
    success: true,
    recipientCount,
    message: `Email blast queued for ${recipientCount} recipients. Configure an email provider (Resend, SendGrid) in production.`,
  });
}
