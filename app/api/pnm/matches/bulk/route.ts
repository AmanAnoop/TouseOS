import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { rankRushMatches, type MemberRushProfile, type RushProfile } from "@/lib/rush-matcher";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: pnms }, { data: members }] = await Promise.all([
    supabase.from("pnm_leads").select("id, full_name, interests, tags, major, hometown, class_year, referral_source, active_member_connection").eq("org_id", orgId),
    supabase.from("member_profiles").select("id, full_name, interests, major, hometown, class_year, role").eq("org_id", orgId).in("membership_status", ["active", "new_member"]),
  ]);

  let computed = 0;
  const memberList = (members ?? []) as MemberRushProfile[];

  const activePnms = (pnms ?? []).filter((p) => !['removed', 'declined'].includes(String((p as { status?: string }).status)));
  for (const pnm of activePnms) {
    const ranked = rankRushMatches(pnm as RushProfile, memberList, 10);
    await supabase.from("pnm_rush_matches").delete().eq("pnm_id", pnm.id);
    if (ranked.length > 0) {
      await supabase.from("pnm_rush_matches").insert(
        ranked.map((r) => ({
          org_id: orgId,
          pnm_id: pnm.id,
          member_id: r.memberId,
          score: r.score,
          shared_interests: r.sharedInterests,
          match_reasons: r.matchReasons,
        })),
      );
      computed++;
    }
  }

  return NextResponse.json({ success: true, pnmProcessed: computed });
}
