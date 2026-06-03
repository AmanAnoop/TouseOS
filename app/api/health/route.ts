import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeHealthScore } from "@/lib/health-score";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: org } = await supabase.from("organizations").select("type").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const [
    membersRes, paymentsRes, pnmRes, eventsRes, tasksRes, reimbsRes, budgetsRes,
  ] = await Promise.all([
    supabase.from("member_profiles").select("membership_status, payment_status, attendance_rate, forms_completed, forms_required").eq("org_id", orgId),
    supabase.from("payments").select("amount, paid_amount, status").eq("org_id", orgId),
    supabase.from("pnm_leads").select("status").eq("org_id", orgId),
    supabase.from("events").select("id").eq("org_id", orgId),
    supabase.from("tasks").select("status").eq("org_id", orgId),
    supabase.from("reimbursements").select("status, created_at").eq("org_id", orgId),
    supabase.from("budgets").select("*, budget_lines(*)").eq("org_id", orgId),
  ]);

  const members = membersRes.data ?? [];
  const activeMemberCount = members.filter((m) =>
    ["active", "new_member"].includes(String(m.membership_status)),
  ).length;

  const eventIds = (eventsRes.data ?? []).map((e: { id: string }) => e.id);
  let rsvps: Array<{ checked_in: boolean; event_id: string }> = [];
  if (eventIds.length > 0) {
    const { data } = await supabase.from("event_rsvps").select("checked_in, event_id").in("event_id", eventIds);
    rsvps = (data ?? []) as typeof rsvps;
  }

  let waivers: Array<{ status: string; waiver_type: string; member_id: string }> | undefined;
  if (org.type === "club_sports") {
    const { data } = await supabase
      .from("sports_waivers")
      .select("status, waiver_type, member_id")
      .eq("org_id", orgId);
    waivers = (data ?? []) as typeof waivers;
  }

  const { breakdown, meta, composite, metricsUsed, metricsTotal } = computeHealthScore({
    members: members as Parameters<typeof computeHealthScore>[0]["members"],
    payments: (paymentsRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["payments"],
    pnmLeads: (pnmRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["pnmLeads"],
    events: (eventsRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["events"],
    rsvps,
    tasks: (tasksRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["tasks"],
    reimbursements: (reimbsRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["reimbursements"],
    budgets: (budgetsRes.data ?? []) as Parameters<typeof computeHealthScore>[0]["budgets"],
    waivers,
    orgType: String(org.type),
    activeMemberCount,
  });

  if (composite !== null) {
    await supabase.from("org_health_scores").upsert({
      org_id: orgId,
      period: "current",
      computed_scores: breakdown,
      composite_score: composite,
      computed_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: "org_id,period" });
  }

  return NextResponse.json({
    breakdown,
    meta,
    composite,
    metricsUsed,
    metricsTotal,
    activeMemberCount,
  });
}
