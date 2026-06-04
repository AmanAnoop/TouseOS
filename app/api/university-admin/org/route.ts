import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUniversityAdminCampuses, isUniversityAdminEmail } from "@/lib/university-admin";
import { fetchOrganizationById } from "@/lib/org-select";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isUniversityAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const service = await createServiceClient();
  const campuses = getUniversityAdminCampuses();

  const { data: org, error } = await fetchOrganizationById(service, orgId);

  if (error || !org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const campus = org.campus != null ? String(org.campus) : "";
  if (campuses.length > 0 && campus && !campuses.includes(campus)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [membersRes, eventsRes, incidentsRes] = await Promise.all([
    service.from("member_profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    service.from("events").select("id, title, starts_at, status").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(5),
    service.from("incident_reports").select("id, severity, status, title, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    org,
    stats: {
      members: membersRes.count ?? 0,
      openIncidents: (incidentsRes.data ?? []).filter((i) => i.status === "open").length,
      highRiskIncidents: (incidentsRes.data ?? []).filter((i) => i.severity === "high" || i.severity === "critical").length,
    },
    recentEvents: eventsRes.data ?? [],
    recentIncidents: incidentsRes.data ?? [],
  });
}
