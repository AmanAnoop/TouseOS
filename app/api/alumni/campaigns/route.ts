import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBulkEmail, textToHtml } from "@/lib/email";

async function getAlumniEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  audience: string,
) {
  let query = supabase
    .from("alumni_profiles")
    .select("email, full_name, mentorship_interest")
    .eq("org_id", orgId)
    .not("email", "is", null);

  if (audience === "mentors") {
    query = query.eq("mentorship_interest", true);
  }

  const { data } = await query;
  return (data ?? [])
    .filter((a: { email: string | null }) => a.email)
    .map((a: { email: string; full_name: string }) => ({
      email: a.email,
      full_name: a.full_name,
    }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("alumni_campaigns")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, subject, body, audience, sendNow } = await request.json();
  if (!orgId || !title || !subject || !body) {
    return NextResponse.json({ error: "orgId, title, subject, and body required" }, { status: 400 });
  }

  const recipients = await getAlumniEmails(supabase, orgId, audience ?? "alumni");
  const emails = recipients.map((r) => r.email);

  let sent = 0;
  let mode: "live" | "log" = "log";

  if (sendNow && emails.length > 0) {
    const result = await sendBulkEmail({ to: emails, subject, html: textToHtml(body) });
    sent = result.sent;
    mode = result.mode;
  }

  const { data: campaign, error } = await supabase
    .from("alumni_campaigns")
    .insert({
      org_id: orgId,
      title,
      subject,
      body,
      audience: audience ?? "alumni",
      status: sendNow ? "sent" : "draft",
      sent_at: sendNow ? new Date().toISOString() : null,
      recipient_count: sendNow ? emails.length : 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (sendNow) {
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user.id,
      action: "alumni_campaign_sent",
      resource_type: "alumni_campaigns",
      resource_id: campaign.id,
      metadata: { recipient_count: emails.length, sent, mode },
    });
  }

  return NextResponse.json({
    campaign,
    recipientCount: emails.length,
    sent,
    mode,
    message: sendNow
      ? mode === "live"
        ? `Sent to ${sent} alumni.`
        : `Logged blast for ${emails.length} alumni. Add RESEND_API_KEY to send live.`
      : "Campaign saved as draft.",
  }, { status: 201 });
}
