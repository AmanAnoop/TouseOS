import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { estimatePlatformMrr, PLATFORM_PLANS, type PlatformPlan } from "@/lib/platform-billing";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();
  const { data: orgs, error } = await service
    .from("organizations")
    .select("id, name, platform_plan, platform_plan_status, stripe_account_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = orgs ?? [];
  const stripeConnected = list.filter((o) => Boolean(o.stripe_account_id)).length;
  const byPlan = PLATFORM_PLANS.map((p) => ({
    plan: p.id,
    label: p.label,
    count: list.filter((o) => (o.platform_plan ?? "starter") === p.id).length,
  }));

  return NextResponse.json({
    plans: PLATFORM_PLANS,
    organizations: list,
    summary: {
      totalOrgs: list.length,
      stripeConnected,
      estimatedMrr: estimatePlatformMrr(list),
      byPlan,
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId, platformPlan, platformPlanStatus } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const validPlans: PlatformPlan[] = ["starter", "chapter", "council", "enterprise"];
  const validStatuses = ["active", "trial", "past_due", "cancelled"];

  const updates: Record<string, string> = {};
  if (platformPlan !== undefined) {
    if (!validPlans.includes(platformPlan)) {
      return NextResponse.json({ error: "Invalid platformPlan" }, { status: 400 });
    }
    updates.platform_plan = platformPlan;
  }
  if (platformPlanStatus !== undefined) {
    if (!validStatuses.includes(platformPlanStatus)) {
      return NextResponse.json({ error: "Invalid platformPlanStatus" }, { status: 400 });
    }
    updates.platform_plan_status = platformPlanStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select("id, name, platform_plan, platform_plan_status, stripe_account_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "platform_plan_updated",
    resource_type: "organizations",
    resource_id: orgId,
    metadata: updates,
  });

  return NextResponse.json({ org: data });
}
