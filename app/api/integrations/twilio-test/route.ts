import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { isTwilioConfigured } from "@/lib/integrations";
import { sendSms } from "@/lib/twilio";
import { getOrgSmsDisplayName } from "@/lib/sms-branding";

/** POST — send a test SMS to the signed-in officer's phone (integration smoke test). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { error: "Twilio is not configured. Add TWILIO_* env vars on the server." },
      { status: 503 },
    );
  }

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!membership || !can(role, "send_mass_texts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("phone, full_name")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const phone = profile?.phone?.trim();
  if (!phone) {
    return NextResponse.json(
      { error: "Add your phone number on your profile before sending a test SMS." },
      { status: 400 },
    );
  }

  const orgName = await getOrgSmsDisplayName(supabase, orgId);
  const result = await sendSms(phone, "TouseOS test from your chapter workspace.", { orgName });

  if (result.status === "failed" || result.error) {
    return NextResponse.json({ error: result.error ?? "SMS failed" }, { status: 502 });
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "twilio_test_sms",
    resource_type: "integrations",
    metadata: { sid: result.sid },
  });

  return NextResponse.json({ ok: true, sid: result.sid, to: phone });
}
