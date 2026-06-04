import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform-admin-auth";

export async function GET() {
  const supabase = await createClient();
  const auth = await requirePlatformAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = await createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const [
    orgsRes,
    smsLogsRes,
    paymentsRes,
    photosRes,
    reportsRes,
    suspendedOrgsRes,
  ] = await Promise.all([
    service.from("organizations").select("id, name, settings, type"),
    service
      .from("audit_logs")
      .select("id, created_at, metadata")
      .or("action.eq.sms_sent,action.eq.comms_sms_sent,action.ilike.%twilio%")
      .gte("created_at", sinceIso)
      .limit(500),
    service.from("payments").select("amount, status, paid_amount").eq("status", "paid"),
    service.from("photos").select("id", { count: "exact", head: true }),
    service
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "greekmatch_report"),
    service.from("organizations").select("id, name, settings"),
  ]);

  const smsCount = smsLogsRes.data?.length ?? 0;
  const paymentsVolume = (paymentsRes.data ?? []).reduce(
    (s, p) => s + Number(p.paid_amount ?? p.amount ?? 0),
    0,
  );

  const orgs = orgsRes.data ?? [];
  const suspended = (suspendedOrgsRes.data ?? []).filter((o) => {
    const s = o.settings as Record<string, unknown> | null;
    return Boolean(s?.platform_suspended);
  });

  const byOrgType: Record<string, number> = {};
  for (const o of orgs) {
    const t = String(o.type ?? "unknown");
    byOrgType[t] = (byOrgType[t] ?? 0) + 1;
  }

  return NextResponse.json({
    periodDays: 30,
    smsMessagesLast30Days: smsCount,
    paymentsVolumeAllTime: paymentsVolume,
    photoCount: photosRes.count ?? 0,
    greekmatchReports: reportsRes.count ?? 0,
    organizationsByType: byOrgType,
    suspendedOrganizations: suspended.map((o) => ({
      id: o.id,
      name: o.name,
    })),
  });
}
