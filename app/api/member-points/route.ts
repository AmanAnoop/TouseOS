import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_ELIGIBILITY_MIN, getEligibilityMin, getPointRules } from "@/lib/attendance-points";
import { canManagePoints, getMemberProfileForUser, getOrgRole } from "@/lib/point-access";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  const isOfficer = canManagePoints(role);

  let entriesQuery = supabase
    .from("member_point_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(isOfficer ? 500 : 200);

  if (!isOfficer) {
    const profile = await getMemberProfileForUser(supabase, orgId, user.id);
    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    entriesQuery = entriesQuery.eq("member_id", profile.id);
  }

  const [entriesRes, rules, eligibilityMin] = await Promise.all([
    entriesQuery,
    getPointRules(supabase, orgId),
    getEligibilityMin(supabase, orgId),
  ]);

  if (entriesRes.error) {
    return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: entriesRes.data ?? [],
    rules,
    eligibilityMin: eligibilityMin ?? DEFAULT_ELIGIBILITY_MIN,
    isOfficer,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId, points, reason, entryType, category } = await request.json();
  if (!orgId || !memberId || points == null) {
    return NextResponse.json({ error: "orgId, memberId, and points required" }, { status: 400 });
  }

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManagePoints(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("member_point_entries").insert({
    org_id: orgId,
    member_id: memberId,
    points: parseInt(String(points), 10),
    reason: reason || "Manual award",
    category: category?.trim() || null,
    entry_type: entryType ?? "earned",
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
