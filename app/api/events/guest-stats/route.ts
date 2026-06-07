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

/** RSVP + guest counts for risk assessment guest-ratio checks. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const eventId = params.get("event_id");
  const orgId = params.get("org_id");
  if (!eventId || !orgId) {
    return NextResponse.json({ error: "event_id and org_id required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_incidents") && !can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("status, member_id, guest_name")
    .eq("event_id", eventId);

  const going = (rsvps ?? []).filter((r) => r.status === "going");
  const members = going.filter((r) => r.member_id).length;
  const guests = going.filter((r) => !r.member_id && r.guest_name).length;
  const ratioOk = guests === 0 || members / guests >= 3;

  const { data: pnmInvites } = await supabase
    .from("event_pnm_invites")
    .select("rsvp_status, checked_in")
    .eq("event_id", eventId)
    .eq("org_id", orgId);

  const pnmRows = pnmInvites ?? [];
  const pnmGoing = pnmRows.filter((r) => r.rsvp_status === "going").length;
  const pnmCheckedIn = pnmRows.filter((r) => r.checked_in).length;

  return NextResponse.json({
    members,
    guests,
    totalGoing: going.length,
    ratioOk,
    invitedPnmCount: pnmRows.length,
    pnmGoing,
    pnmCheckedIn,
    pnmPending: pnmRows.filter((r) => r.rsvp_status === "pending").length,
  });
}
