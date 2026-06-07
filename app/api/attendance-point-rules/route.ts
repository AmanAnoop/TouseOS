import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import {
  DEFAULT_ELIGIBILITY_MIN,
  DEFAULT_POINT_RULES,
  getEligibilityMin,
  getPointRules,
  normalizePointRule,
  saveEligibilityMin,
  savePointRules,
  type PointRule,
} from "@/lib/attendance-points";

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

function canManageRules(role: RoleName): boolean {
  return can(role, "manage_events") || can(role, "edit_roster") || can(role, "manage_org_settings");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await roleForOrg(supabase, user.id, orgId);
  const [rules, eligibilityMin] = await Promise.all([
    getPointRules(supabase, orgId),
    getEligibilityMin(supabase, orgId),
  ]);

  return NextResponse.json({
    rules,
    defaults: DEFAULT_POINT_RULES,
    eligibilityMin,
    defaultEligibilityMin: DEFAULT_ELIGIBILITY_MIN,
    canManage: canManageRules(role),
    persisted: rules.length > 0,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, rules, eligibilityMin } = body as {
    orgId: string;
    rules?: PointRule[];
    eligibilityMin?: number;
  };

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!canManageRules(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (eligibilityMin != null) {
    const elig = await saveEligibilityMin(supabase, orgId, eligibilityMin);
    if (elig.error) return NextResponse.json({ error: elig.error }, { status: 500 });
  }

  if (rules != null) {
    const cleaned: PointRule[] = [];
    for (let i = 0; i < rules.length; i++) {
      const row = normalizePointRule(rules[i]);
      if (row) cleaned.push(row);
    }
    const result = await savePointRules(supabase, orgId, cleaned);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    const min = await getEligibilityMin(supabase, orgId);
    return NextResponse.json({ rules: result.rules, eligibilityMin: min, persisted: true });
  }

  const min = await getEligibilityMin(supabase, orgId);
  const saved = await getPointRules(supabase, orgId);
  return NextResponse.json({ rules: saved, eligibilityMin: min });
}
