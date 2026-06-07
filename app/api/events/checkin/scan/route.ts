import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { verifyRotatingTicketToken } from "@/lib/event-ticket-token";
import { awardCheckInPoints } from "@/lib/attendance-points";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, orgId } = await request.json();
  if (!token || !orgId) {
    return NextResponse.json({ error: "token and orgId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "") as RoleName;
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const verified = verifyRotatingTicketToken(String(token));
  if (!verified.valid || !verified.userId || !verified.eventId) {
    return NextResponse.json({
      success: false,
      reason: verified.reason === "expired" ? "expired" : "invalid",
      message: verified.reason === "expired"
        ? "That ticket has expired — ask them to show a fresh code."
        : "That code didn't scan. Try again or check them in by name.",
    });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, type, title")
    .eq("id", verified.eventId)
    .eq("org_id", orgId)
    .single();

  if (!event) {
    return NextResponse.json({ success: false, message: "This ticket is for a different event." });
  }

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, full_name, profile_photo_url, user_id")
    .eq("user_id", verified.userId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ success: false, message: "Member not found in this chapter." });
  }

  const now = new Date().toISOString();

  let { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("id, checked_in")
    .eq("event_id", verified.eventId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!rsvp) {
    const { data: created } = await supabase
      .from("event_rsvps")
      .insert({
        event_id: verified.eventId,
        member_id: member.id,
        user_id: member.user_id,
        status: "going",
        checked_in: true,
        checked_in_at: now,
        check_in_method: "rotating_ticket",
      })
      .select("id, checked_in")
      .single();
    rsvp = created;
  } else if (!rsvp.checked_in) {
    await supabase
      .from("event_rsvps")
      .update({ checked_in: true, checked_in_at: now, check_in_method: "rotating_ticket" })
      .eq("id", rsvp.id);
  }

  const pointsResult = await awardCheckInPoints({
    supabase,
    orgId,
    memberId: member.id,
    eventId: verified.eventId,
    eventType: String(event.type),
    createdBy: user.id,
  });

  return NextResponse.json({
    success: true,
    alreadyCheckedIn: Boolean(rsvp?.checked_in),
    memberName: member.full_name,
    memberPhotoUrl: member.profile_photo_url,
    pointsAwarded: pointsResult.awarded ? pointsResult.points : 0,
    eventTitle: event.title,
  });
}
