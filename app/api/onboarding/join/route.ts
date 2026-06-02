import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteCode } = await request.json();
  const code = String(inviteCode ?? "").trim().toUpperCase();
  if (code.length < 6) {
    return NextResponse.json({ error: "Enter a valid invite code" }, { status: 400 });
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
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name, type")
    .eq("invite_code", code)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const fullName =
    String(user.user_metadata?.full_name ?? "") ||
    user.email?.split("@")[0] ||
    "New Member";

  await admin.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
  });

  const { error: memberError } = await admin.from("org_members").upsert(
    {
      org_id: org.id,
      user_id: user.id,
      role: "general_member",
      status: "pending_invite",
    },
    { onConflict: "org_id,user_id" },
  );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { data: existingProfile } = await admin
    .from("member_profiles")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await admin.from("member_profiles").insert({
      org_id: org.id,
      user_id: user.id,
      full_name: fullName,
      email: user.email ?? "",
      role: "general_member",
      membership_status: "pending_invite",
    });
  }

  return NextResponse.json({
    success: true,
    org: { id: org.id, name: org.name, type: org.type },
    status: "pending_invite",
    message: `Join request sent to ${org.name}. An officer will approve your membership.`,
  });
}
