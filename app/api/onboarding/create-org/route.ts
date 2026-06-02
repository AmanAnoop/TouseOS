import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const VALID_ORG_TYPES = [
  "fraternity",
  "sorority",
  "club_sports",
  "general_org",
  "university",
] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, campus, councilOrLeague, contactEmail } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }
  if (!type || !VALID_ORG_TYPES.includes(type)) {
    return NextResponse.json({ error: "Valid organization type is required" }, { status: 400 });
  }

  const { count: existing } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "removed");

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: "You already belong to an organization" }, { status: 400 });
  }

  const admin = await createServiceClient();
  const fullName =
    String(user.user_metadata?.full_name ?? "") ||
    user.email?.split("@")[0] ||
    "Chapter Admin";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: name.trim(),
      type,
      campus: campus?.trim() || null,
      council_or_league: councilOrLeague?.trim() || null,
      contact_email: contactEmail?.trim() || user.email,
    })
    .select("id, name, invite_code, type")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Failed to create organization" }, { status: 500 });
  }

  await admin.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
  });

  const { error: memberError } = await admin.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: profileError } = await admin.from("member_profiles").insert({
    org_id: org.id,
    user_id: user.id,
    full_name: fullName,
    email: user.email ?? "",
    role: "owner",
    membership_status: "active",
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    org_id: org.id,
    actor_id: user.id,
    action: "org_created",
    resource_type: "organizations",
    resource_id: org.id,
    metadata: { name: org.name, type: org.type },
  });

  return NextResponse.json({
    success: true,
    org: {
      id: org.id,
      name: org.name,
      type: org.type,
      inviteCode: org.invite_code,
    },
  });
}
