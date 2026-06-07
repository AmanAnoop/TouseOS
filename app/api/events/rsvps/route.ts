import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

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

/** Bulk RSVP data for reports and engagement dashboards. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const eventIdsParam = searchParams.get("event_ids");
  const checkedInOnly = searchParams.get("checked_in") === "true";
  const withRelations = searchParams.get("expand") === "1";

  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "view_reports") && !can(role, "manage_events") && !can(role, "view_roster")) {
    const { data: mp } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mp) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let eventIds: string[] = [];
  if (eventIdsParam) {
    eventIds = eventIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const { data: events } = await supabase.from("events").select("id").eq("org_id", orgId);
    eventIds = (events ?? []).map((e) => e.id);
  }

  if (eventIds.length === 0) {
    return NextResponse.json({ rsvps: [], counts: {} });
  }

  let query = withRelations
    ? supabase
        .from("event_rsvps")
        .select("*, events(title, starts_at), member_profiles(full_name)")
        .in("event_id", eventIds)
    : supabase
        .from("event_rsvps")
        .select("member_id, event_id, checked_in, status")
        .in("event_id", eventIds);

  if (checkedInOnly) query = query.eq("checked_in", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rsvps = (data ?? []) as unknown as Array<{ event_id: string; status?: string; checked_in?: boolean }>;
  const counts: Record<string, { going: number; checkedIn: number }> = {};
  for (const id of eventIds) counts[id] = { going: 0, checkedIn: 0 };
  for (const r of rsvps) {
    if (!counts[r.event_id]) counts[r.event_id] = { going: 0, checkedIn: 0 };
    if (r.status === "going") counts[r.event_id].going += 1;
    if (r.checked_in) counts[r.event_id].checkedIn += 1;
  }

  return NextResponse.json({ rsvps, counts });
}
