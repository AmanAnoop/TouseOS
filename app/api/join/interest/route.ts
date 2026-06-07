import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    inviteCode,
    fullName,
    email,
    phone,
    classYear,
    major,
    hometown,
    instagramHandle,
    referralSource,
    interests,
    smsConsent,
    campaign,
    referredByMember,
  } = body;

  if (!inviteCode || !fullName?.trim()) {
    return NextResponse.json({ error: "inviteCode and fullName required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("invite_code", String(inviteCode).toUpperCase())
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const interestList = Array.isArray(interests)
    ? interests.map((s: string) => String(s).toLowerCase().trim()).filter(Boolean).slice(0, 15)
    : typeof interests === "string"
      ? interests.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 15)
      : [];

  let activeMemberConnection: string | null = null;
  if (referredByMember) {
    const refId = String(referredByMember);
    const { data: refMember } = await supabase
      .from("member_profiles")
      .select("full_name")
      .eq("org_id", org.id)
      .eq("id", refId)
      .maybeSingle();
    activeMemberConnection = refMember?.full_name ?? refId;
  }

  const { data, error } = await supabase.from("pnm_leads").insert({
    org_id: org.id,
    full_name: fullName.trim(),
    email: email || null,
    phone: phone || null,
    instagram_handle: instagramHandle?.replace(/^@/, "") || null,
    class_year: classYear || null,
    major: major || null,
    hometown: hometown || null,
    referral_source: referralSource || null,
    active_member_connection: activeMemberConnection,
    interests: interestList,
    communication_consent: Boolean(smsConsent),
    consent_timestamp: smsConsent ? new Date().toISOString() : null,
    consent_source: smsConsent ? "interest_form" : null,
    campaign: campaign || null,
    status: "lead",
  }).select("id, full_name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    pnmId: data.id,
    orgName: org.name,
  }, { status: 201 });
}
