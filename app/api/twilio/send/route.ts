import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTwilioConfigured } from "@/lib/integrations";
import { sendMassSms, isWithinQuietHours } from "@/lib/twilio";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, recipients, body: messageBody, campaign } = await request.json();

  if (!orgId || !recipients?.length || !messageBody) {
    return NextResponse.json({ error: "orgId, recipients, and body are required" }, { status: 400 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { error: "Twilio SMS is not configured on this server." },
      { status: 503 },
    );
  }

  // Enforce quiet hours
  if (isWithinQuietHours(new Date())) {
    return NextResponse.json({
      error: "Quiet hours active (9pm–9am). Messages will not be sent during this time.",
    }, { status: 429 });
  }

  // Verify all recipients are opted in and not opted out
  const phoneNumbers = recipients.map((r: { phone: string }) => r.phone);
  const { data: leads } = await supabase
    .from("pnm_leads")
    .select("id, phone, full_name, communication_consent, opted_out")
    .eq("org_id", orgId)
    .in("phone", phoneNumbers);

  const eligible = (leads ?? []).filter(
    (l: Record<string, unknown>) => l.communication_consent && !l.opted_out,
  );

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible opted-in recipients" }, { status: 400 });
  }

  // Audit log before sending
  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "mass_sms_sent",
    resource_type: "pnm_texts",
    metadata: {
      recipient_count: eligible.length,
      campaign,
      body_preview: messageBody.slice(0, 100),
    },
  });

  const results = await sendMassSms(
    eligible.map((l: Record<string, unknown>) => ({
      phone: String(l.phone),
      name: String(l.full_name),
    })),
    messageBody,
  );

  // Record each message
  const textRows = eligible.map((lead: Record<string, unknown>, i: number) => ({
    org_id: orgId,
    sent_by: user.id,
    pnm_id: lead.id,
    to_phone: String(lead.phone),
    body: messageBody,
    twilio_sid: results[i]?.sid ?? null,
    status: results[i]?.status ?? "failed",
    is_mass_send: true,
    campaign: campaign ?? null,
    sent_at: new Date().toISOString(),
    error_message: results[i]?.error ?? null,
  }));

  await supabase.from("pnm_texts").insert(textRows);

  const delivered = results.filter((r) => r.status !== "failed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    success: true,
    delivered,
    failed,
    total: eligible.length,
  });
}
