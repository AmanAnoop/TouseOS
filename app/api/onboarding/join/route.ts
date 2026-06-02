import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    const { data, error } = await supabase.rpc("join_org_by_invite_code", {
      p_invite_code: code,
    });

    if (!error && data) {
      const row = data as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        org: { id: String(row.id), name: String(row.name), type: String(row.type) },
        status: String(row.status ?? "pending_invite"),
        message: `Join request sent to ${row.name}. An officer will approve your membership.`,
      });
    }

    if (error && !error.message.includes("does not exist")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fallback: service role
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || serviceKey.includes("your-service")) {
      return NextResponse.json(
        { error: "Run migration 015_onboarding_rpc.sql or configure SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 },
      );
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

    await admin.from("profiles").upsert({ id: user.id, full_name: fullName });
    await admin.from("org_members").upsert(
      { org_id: org.id, user_id: user.id, role: "general_member", status: "pending_invite" },
      { onConflict: "org_id,user_id" },
    );

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
