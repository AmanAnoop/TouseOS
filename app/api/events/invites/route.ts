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

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");
  const orgId = searchParams.get("org_id");
  if (!eventId || !orgId) {
    return NextResponse.json({ error: "event_id and org_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("event_pnm_invites")
    .select("pnm_id")
    .eq("event_id", eventId)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pnmIds: (data ?? []).map((r) => r.pnm_id) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, eventId, pnmIds } = await request.json();
  if (!orgId || !eventId || !Array.isArray(pnmIds)) {
    return NextResponse.json({ error: "orgId, eventId, and pnmIds required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_recruitment") && !can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("event_pnm_invites").delete().eq("event_id", eventId).eq("org_id", orgId);

  if (pnmIds.length > 0) {
    const rows = pnmIds.map((pnmId: string) => ({
      event_id: eventId,
      org_id: orgId,
      pnm_id: pnmId,
    }));
    const { error } = await supabase.from("event_pnm_invites").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: pnmIds.length });
}
