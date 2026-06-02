import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("pnm_leads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, fullName, email, phone, instagramHandle, classYear, major,
    hometown, referralSource, activeMemberConnection, communicationConsent,
    consentSource, campaign, tags,
  } = body;

  const { data, error } = await supabase.from("pnm_leads").insert({
    org_id: orgId,
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    instagram_handle: instagramHandle || null,
    class_year: classYear || null,
    major: major || null,
    hometown: hometown || null,
    referral_source: referralSource || null,
    active_member_connection: activeMemberConnection || null,
    communication_consent: communicationConsent ?? false,
    consent_timestamp: communicationConsent ? new Date().toISOString() : null,
    consent_source: consentSource || null,
    campaign: campaign || null,
    tags: tags ?? [],
    status: "lead",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, notes, tags, optedOut } = await request.json();

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (tags !== undefined) updates.tags = tags;
  if (optedOut !== undefined) {
    updates.opted_out = optedOut;
    if (optedOut) updates.opted_out_at = new Date().toISOString();
  }

  const { data, error } = await supabase.from("pnm_leads").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("pnm_leads").update({ status: "removed" }).eq("id", id);
  return NextResponse.json({ success: true });
}
