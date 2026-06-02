import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, type, campus, councilOrLeague, contactEmail } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "name and type required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data, error } = await service.rpc("create_onboarding_org", {
    p_user_id: user.id,
    p_name: name,
    p_type: type,
    p_campus: campus ?? null,
    p_council: councilOrLeague ?? null,
    p_contact_email: contactEmail ?? null,
  });

  if (error) {
    if (error.message.includes("function") || error.code === "PGRST202") {
      const { data: org, error: insertErr } = await service.from("organizations").insert({
        name,
        type,
        campus: campus ?? null,
        council_or_league: councilOrLeague ?? null,
        contact_email: contactEmail ?? null,
      }).select().single();
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
      await service.from("org_members").upsert({
        org_id: org.id,
        user_id: user.id,
        role: "owner",
        status: "active",
      }, { onConflict: "org_id,user_id" });
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
      await service.from("member_profiles").insert({
        org_id: org.id,
        user_id: user.id,
        full_name: profile?.full_name ?? name,
        email: profile?.email ?? user.email ?? "member@local",
        role: "owner",
        membership_status: "active",
      });
      return NextResponse.json({ org, inviteCode: org.invite_code });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    org: data,
    inviteCode: (data as { invite_code?: string })?.invite_code,
  });
}
