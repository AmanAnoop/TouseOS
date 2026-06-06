import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { isTwilioConfigured } from "@/lib/integrations";
import { sendMassSms, isWithinQuietHours } from "@/lib/twilio";

const OFFICER_ROLES: RoleName[] = [
  "owner", "president", "vice_president", "treasurer", "secretary",
  "social_chair", "recruitment_chair", "risk_manager", "philanthropy_chair",
  "nme_chair", "pr_chair", "advisor", "captain", "co_captain", "coach",
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("org_id", orgId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, body, audience, pinned, sendSms } = await request.json();
  if (!orgId || !title || !body) {
    return NextResponse.json({ error: "orgId, title, and body required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  const isOfficer = OFFICER_ROLES.includes(role) || can(role, "send_mass_texts");
  if (!isOfficer) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const audienceList = Array.isArray(audience) ? audience : [audience ?? "all"];

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      org_id: orgId,
      author_id: user.id,
      author_name: profile?.full_name ?? "Officer",
      title,
      body,
      audience: audienceList,
      pinned: Boolean(pinned),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "announcement_posted",
    resource_type: "announcements",
    resource_id: data.id,
    metadata: { title, audience: audienceList },
  });

  let smsSent = 0;
  if (sendSms && isTwilioConfigured() && !isWithinQuietHours(new Date())) {
    const { data: members } = await supabase
      .from("member_profiles")
      .select("full_name, phone, membership_status")
      .eq("org_id", orgId)
      .in("membership_status", ["active", "new_member"])
      .not("phone", "is", null);

    const recipients = (members ?? [])
      .filter((m) => m.phone)
      .map((m) => ({ phone: String(m.phone), name: String(m.full_name) }));

    if (recipients.length > 0) {
      const smsBody = `${title.trim()}\n\n${body.trim()}`.slice(0, 1500);
      const results = await sendMassSms(recipients, smsBody);
      smsSent = results.filter((r) => r.status !== "failed" && !r.error).length;
    }
  }

  return NextResponse.json({ ...data, smsSent }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const orgId = searchParams.get("org_id");
  if (!id || !orgId) {
    return NextResponse.json({ error: "id and org_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  const isOfficer = OFFICER_ROLES.includes(role) || can(role, "send_mass_texts");
  if (!isOfficer) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "announcement_deleted",
    resource_type: "announcements",
    resource_id: id,
  });

  return NextResponse.json({ ok: true });
}
