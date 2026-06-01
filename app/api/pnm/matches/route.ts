import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import {
  rankRushMatches,
  type MemberRushProfile,
  type RushProfile,
} from "@/lib/rush-matcher";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const pnmId = searchParams.get("pnm_id");
  const refresh = searchParams.get("refresh") === "true";

  if (!orgId || !pnmId) {
    return NextResponse.json({ error: "org_id and pnm_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "view_recruitment") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!refresh) {
    const { data: cached } = await supabase
      .from("pnm_rush_matches")
      .select("*, member_profiles(id, full_name, profile_photo_url, major, hometown)")
      .eq("pnm_id", pnmId)
      .eq("org_id", orgId)
      .order("score", { ascending: false })
      .limit(15);

    if (cached && cached.length > 0) {
      return NextResponse.json({ matches: cached, cached: true });
    }
  }

  const { data: pnm, error: pnmErr } = await supabase
    .from("pnm_leads")
    .select("id, full_name, interests, tags, major, hometown, class_year, referral_source, active_member_connection, ai_interest_summary")
    .eq("id", pnmId)
    .eq("org_id", orgId)
    .single();

  if (pnmErr || !pnm) return NextResponse.json({ error: "PNM not found" }, { status: 404 });

  const { data: members, error: memErr } = await supabase
    .from("member_profiles")
    .select("id, full_name, interests, major, hometown, class_year, role")
    .eq("org_id", orgId)
    .in("membership_status", ["active", "new_member", "alumni"]);

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

  const ranked = rankRushMatches(
    pnm as RushProfile,
    (members ?? []) as MemberRushProfile[],
    15,
  );

  await supabase.from("pnm_rush_matches").delete().eq("pnm_id", pnmId);

  if (ranked.length > 0) {
    await supabase.from("pnm_rush_matches").insert(
      ranked.map((r) => ({
        org_id: orgId,
        pnm_id: pnmId,
        member_id: r.memberId,
        score: r.score,
        shared_interests: r.sharedInterests,
        match_reasons: r.matchReasons,
      })),
    );
  }

  const { data: stored } = await supabase
    .from("pnm_rush_matches")
    .select("*, member_profiles(id, full_name, profile_photo_url, major, hometown)")
    .eq("pnm_id", pnmId)
    .order("score", { ascending: false });

  return NextResponse.json({
    matches: stored ?? [],
    cached: false,
    pnmSummary: pnm.ai_interest_summary,
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id") ?? (await request.json().catch(() => ({}))).orgId;

  const req = new Request(
    `${request.url.split("?")[0]}?org_id=${orgId}&pnm_id=${(await request.clone().json()).pnmId}&refresh=true`,
    { headers: request.headers },
  );
  return GET(req);
}
