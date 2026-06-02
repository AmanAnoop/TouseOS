import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DEMO_ORG_ID = "11111111-1111-1111-1111-111111111111";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count: existing } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "removed");

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: "You already belong to an organization" }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", DEMO_ORG_ID)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      {
        error:
          "Demo chapter not found. Run migration 005_seed.sql in Supabase, or create your own organization.",
      },
      { status: 404 },
    );
  }

  const fullName =
    String(user.user_metadata?.full_name ?? "") ||
    user.email?.split("@")[0] ||
    "Demo User";

  await admin.from("profiles").upsert({ id: user.id, full_name: fullName });

  await admin.from("org_members").upsert(
    {
      org_id: DEMO_ORG_ID,
      user_id: user.id,
      role: "president",
      status: "active",
    },
    { onConflict: "org_id,user_id" },
  );

  const { data: profile } = await admin
    .from("member_profiles")
    .select("id")
    .eq("org_id", DEMO_ORG_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    await admin.from("member_profiles").insert({
      org_id: DEMO_ORG_ID,
      user_id: user.id,
      full_name: fullName,
      email: user.email ?? "",
      role: "president",
      membership_status: "active",
    });
  } else {
    await admin
      .from("member_profiles")
      .update({ user_id: user.id, role: "president", membership_status: "active" })
      .eq("id", profile.id);
  }

  return NextResponse.json({
    success: true,
    org: { id: org.id, name: org.name },
    message: `Welcome to ${org.name} (demo data). Explore the dashboard, payments, and PNM tools.`,
  });
}
