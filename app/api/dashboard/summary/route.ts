import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDashboardOfficer } from "@/lib/dashboard-roles";

/** Dashboard snapshot for client widgets and future SPA hydration. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const orgType = searchParams.get("org_type") ?? "general_org";
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const role = String(membership.role ?? "general_member");
  const data = await loadDashboardData(supabase, { orgId, orgType, userId: user.id });
  const isOfficer = isDashboardOfficer(role);

  return NextResponse.json({
    orgType,
    role,
    isOfficer,
    members: data.members,
    payments: data.payments,
    announcements: data.announcements,
    tasks: isOfficer ? data.tasks : data.myTasks,
    myTasks: data.myTasks,
    pnmLeads: data.pnmLeads,
    events: data.events,
    stats: data.stats,
    health: data.health,
    deadlineItems: isOfficer ? data.deadlineItems : [],
    setupSteps: data.setupSteps,
    attendanceTrend: isOfficer ? data.attendanceTrend : [],
    engagementTrend: isOfficer ? data.engagementTrend : [],
    photos: data.photos,
    waivers: data.waivers,
    sportsTrips: data.sportsTrips,
    sportsTryouts: data.sportsTryouts,
    clubApplications: data.clubApplications,
  });
}
