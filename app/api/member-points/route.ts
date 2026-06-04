import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { DEFAULT_ELIGIBILITY_MIN, getEligibilityMin, getPointRules } from "@/lib/attendance-points";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const [entriesRes, rules, eligibilityMin] = await Promise.all([
    supabase
      .from("member_point_entries")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100),
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
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId, points, reason, entryType } = await request.json();
  if (!orgId || !memberId || points == null) {
    return NextResponse.json({ error: "orgId, memberId, and points required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("member_point_entries").insert({
    org_id: orgId,
    member_id: memberId,
    points: parseInt(String(points), 10),
    reason: reason || "Manual award",
    entry_type: entryType ?? "earned",
    created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
