import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRotatingTicketToken, TICKET_WINDOW_MS } from "@/lib/event-ticket-token";
import { checkEventPointGate } from "@/lib/member-points";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, title, point_gate_min, point_gate_category")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, full_name, profile_photo_url")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Not a chapter member" }, { status: 403 });

  const gate = await checkEventPointGate({
    supabase,
    orgId: event.org_id,
    memberId: member.id,
    pointGateMin: event.point_gate_min,
    pointGateCategory: event.point_gate_category,
  });

  if (!gate.allowed) {
    return NextResponse.json({
      revoked: true,
      message: gate.message,
      required: gate.required,
      current: gate.current,
      category: gate.category,
    });
  }

  const token = createRotatingTicketToken(user.id, eventId);
  const expiresAt = new Date(Math.ceil(Date.now() / TICKET_WINDOW_MS) * TICKET_WINDOW_MS).toISOString();

  return NextResponse.json({
    token,
    expiresAt,
    refreshMs: TICKET_WINDOW_MS,
    memberName: member.full_name,
    memberPhotoUrl: member.profile_photo_url,
    eventTitle: event.title,
  });
}
