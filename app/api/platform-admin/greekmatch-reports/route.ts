import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("audit_logs")
    .select("id, org_id, actor_id, resource_id, metadata, created_at")
    .eq("action", "greekmatch_report")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reports = data ?? [];
  const orgIds = [...new Set(reports.map((r) => r.org_id).filter(Boolean))];
  const userIds = [...new Set(reports.map((r) => r.resource_id).filter(Boolean))];

  const [{ data: orgs }, { data: profiles }] = await Promise.all([
    orgIds.length
      ? service.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? service.from("greekmatch_profiles").select("user_id, display_name, paused, is_active").in("user_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return NextResponse.json({
    reports: reports.map((r) => {
      const meta = r.metadata as { status?: string; reason?: string; suspended?: boolean };
      const profile = profileMap.get(r.resource_id);
      return {
        ...r,
        org_name: orgMap.get(r.org_id) ?? "Unknown",
        status: meta?.status ?? "open",
        reason: meta?.reason ?? "unspecified",
        suspended: meta?.suspended ?? Boolean(profile && !profile.is_active),
        target_display_name: profile?.display_name ?? null,
        profile_paused: profile?.paused ?? false,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId, status } = await request.json();
  if (!reportId || !["open", "reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "reportId and status required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: row } = await service
    .from("audit_logs")
    .select("metadata")
    .eq("id", reportId)
    .eq("action", "greekmatch_report")
    .single();

  if (!row) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const metadata = { ...(row.metadata as object ?? {}), status, reviewed_at: new Date().toISOString() };
  const { error } = await service.from("audit_logs").update({ metadata }).eq("id", reportId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
