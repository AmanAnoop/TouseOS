import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const service = await createServiceClient();

  const [orgRes, membersRes, eventsRes, incidentsRes, paymentsRes, campaignsRes] = await Promise.all([
    service.from("organizations").select("*").eq("id", orgId).single(),
    service.from("member_profiles").select("id, membership_status").eq("org_id", orgId),
    service.from("events").select("id, title, starts_at, status").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(5),
    service.from("incident_reports").select("id, severity, status, created_at").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
    service.from("payments").select("status, amount, paid_amount").eq("org_id", orgId),
    service.from("philanthropy_campaigns").select("title, raised_amount, goal_amount, is_active").eq("org_id", orgId),
  ]);

  if (orgRes.error || !orgRes.data) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const members = membersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const paidDues = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.paid_amount ?? 0), 0);

  return NextResponse.json({
    org: orgRes.data,
    stats: {
      members: members.length,
      activeMembers: members.filter((m) => m.membership_status === "active").length,
      events: eventsRes.data?.length ?? 0,
      openIncidents: (incidentsRes.data ?? []).filter((i) => i.status === "open").length,
      duesCollected: paidDues,
      philanthropyRaised: (campaignsRes.data ?? []).reduce((s, c) => s + Number(c.raised_amount ?? 0), 0),
    },
    recentEvents: eventsRes.data ?? [],
    recentIncidents: incidentsRes.data ?? [],
    campaigns: campaignsRes.data ?? [],
  });
}
