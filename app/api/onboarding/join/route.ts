import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteCode } = await request.json();
  if (!inviteCode?.trim()) {
    return NextResponse.json({ error: "inviteCode required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const code = inviteCode.trim().toUpperCase();

  const { data, error } = await service.rpc("join_org_by_invite_code", {
    p_user_id: user.id,
    p_invite_code: code,
  });

  if (error) {
    const { data: org } = await service
      .from("organizations")
      .select("id, name, invite_code")
      .eq("invite_code", code)
      .maybeSingle();
    if (!org) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

    await service.from("org_members").upsert({
      org_id: org.id,
      user_id: user.id,
      role: "general_member",
      status: "active",
    }, { onConflict: "org_id,user_id" });

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
    const { data: existing } = await service
      .from("member_profiles")
      .select("id")
      .eq("org_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await service.from("member_profiles").insert({
        org_id: org.id,
        user_id: user.id,
        full_name: profile?.full_name ?? "Member",
        email: profile?.email ?? user.email ?? "member@local",
        role: "general_member",
        membership_status: "active",
      });
    }
    return NextResponse.json({ org });
  }

  return NextResponse.json({ org: data });
}
