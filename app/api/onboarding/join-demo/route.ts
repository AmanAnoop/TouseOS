import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DEMO_ORG_ID = "11111111-1111-1111-1111-111111111111";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const { data: org } = await service.from("organizations").select("id, name").eq("id", DEMO_ORG_ID).maybeSingle();

  if (!org) {
    return NextResponse.json({
      error: "Demo chapter not found. Run supabase/migrations/005_seed.sql in your Supabase project.",
    }, { status: 404 });
  }

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
      full_name: profile?.full_name ?? "Demo Member",
      email: profile?.email ?? user.email ?? "demo@local",
      role: "general_member",
      membership_status: "active",
    });
  }

  return NextResponse.json({ org });
}
