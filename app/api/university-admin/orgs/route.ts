import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUniversityAdminCampuses, isUniversityAdminEmail } from "@/lib/university-admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isUniversityAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();
  const campuses = getUniversityAdminCampuses();

  let query = service
    .from("organizations")
    .select("id, name, type, campus, council_or_league, created_at")
    .order("name");

  if (campuses.length > 0) {
    query = query.in("campus", campuses);
  }

  const { data: orgs, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgIds = (orgs ?? []).map((o) => o.id);
  const memberCounts: Record<string, number> = {};
  const incidentCounts: Record<string, number> = {};

  if (orgIds.length > 0) {
    const [membersRes, incidentsRes] = await Promise.all([
      service.from("member_profiles").select("org_id").in("org_id", orgIds),
      service.from("incident_reports").select("org_id, severity").in("org_id", orgIds),
    ]);

    for (const id of orgIds) {
      memberCounts[id] = 0;
      incidentCounts[id] = 0;
    }
    for (const row of membersRes.data ?? []) {
      memberCounts[row.org_id as string] += 1;
    }
    for (const row of incidentsRes.data ?? []) {
      if (row.severity === "high" || row.severity === "critical") {
        incidentCounts[row.org_id as string] += 1;
      }
    }
  }

  return NextResponse.json({
    campuses: campuses.length > 0 ? campuses : ["all"],
    orgs: (orgs ?? []).map((o) => ({
      ...o,
      memberCount: memberCounts[o.id] ?? 0,
      highRiskIncidents: incidentCounts[o.id] ?? 0,
    })),
  });
}
