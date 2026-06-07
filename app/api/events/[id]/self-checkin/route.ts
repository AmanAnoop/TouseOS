import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyChapterCheckInToken } from "@/lib/event-ticket-token";
import { checkEventPointGate } from "@/lib/member-points";
import { awardCheckInPoints } from "@/lib/attendance-points";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  if (!verifyChapterCheckInToken(String(token), eventId)) {
    return NextResponse.json({
      success: false,
      message: "This check-in code has expired. Ask an officer for a fresh QR on screen.",
    });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, type, title, point_gate_min, point_gate_category")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, full_name")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ success: false, message: "You need to be signed in as a chapter member." });
  }

  const gate = await checkEventPointGate({
    supabase,
    orgId: event.org_id,
    memberId: member.id,
    pointGateMin: event.point_gate_min,
    pointGateCategory: event.point_gate_category,
  });

  if (!gate.allowed) {
    return NextResponse.json({ success: false, message: gate.message, revoked: true });
  }

  const now = new Date().toISOString();

  let { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("id, checked_in")
    .eq("event_id", eventId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!rsvp) {
    const { data: created } = await supabase
      .from("event_rsvps")
      .insert({
        event_id: eventId,
        member_id: member.id,
        user_id: user.id,
        status: "going",
        checked_in: true,
        checked_in_at: now,
        check_in_method: "qr",
      })
      .select("id, checked_in")
      .single();
    rsvp = created;
  } else if (!rsvp.checked_in) {
    await supabase
      .from("event_rsvps")
      .update({ checked_in: true, checked_in_at: now, check_in_method: "qr" })
      .eq("id", rsvp.id);
  } else {
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: true,
      message: `You're already checked in to ${event.title}.`,
    });
  }

  const pointsResult = await awardCheckInPoints({
    supabase,
    orgId: event.org_id,
    memberId: member.id,
    eventId,
    eventType: String(event.type),
    createdBy: user.id,
  });

  const pointsNote = pointsResult.awarded ? ` +${pointsResult.points} points` : "";

  return NextResponse.json({
    success: true,
    message: `You're checked in to ${event.title}!${pointsNote}`,
    pointsAwarded: pointsResult.awarded ? pointsResult.points : 0,
  });
}
