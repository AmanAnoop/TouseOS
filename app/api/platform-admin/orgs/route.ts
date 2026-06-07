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
  const { data: orgs, error } = await service
    .from("organizations")
    .select("id, name, type, campus, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgIds = (orgs ?? []).map((o) => o.id);
  const counts: Record<string, { members: number; events: number }> = {};

  if (orgIds.length > 0) {
    const [membersRes, eventsRes] = await Promise.all([
      service.from("member_profiles").select("org_id").in("org_id", orgIds),
      service.from("events").select("org_id").in("org_id", orgIds),
    ]);

    for (const id of orgIds) {
      counts[id] = { members: 0, events: 0 };
    }
    for (const row of membersRes.data ?? []) {
      counts[row.org_id as string].members += 1;
    }
    for (const row of eventsRes.data ?? []) {
      counts[row.org_id as string].events += 1;
    }
  }

  return NextResponse.json({
    orgs: (orgs ?? []).map((o) => ({
      ...o,
      memberCount: counts[o.id]?.members ?? 0,
      eventCount: counts[o.id]?.events ?? 0,
    })),
  });
}
