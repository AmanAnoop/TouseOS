import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { PnmRsvpStatus } from "@/lib/pnm-invite";

const VALID: PnmRsvpStatus[] = ["going", "maybe", "declined"];

/** Public PNM RSVP via invite token (no auth). */
export async function POST(request: Request) {
  const { token, status } = await request.json();
  if (!token || !status) {
    return NextResponse.json({ error: "token and status required" }, { status: 400 });
  }

  if (!VALID.includes(status as PnmRsvpStatus)) {
    return NextResponse.json({ error: "status must be going, maybe, or declined" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: invite, error: fetchErr } = await supabase
    .from("event_pnm_invites")
    .select("id, event_id, org_id, rsvp_status, events ( starts_at )")
    .eq("invite_token", token)
    .single();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const rawEvent = invite.events as { starts_at?: string } | { starts_at?: string }[] | null;
  const event = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;
  if (event?.starts_at && new Date(event.starts_at) < new Date()) {
    return NextResponse.json({ error: "This event has already started" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("event_pnm_invites")
    .update({
      rsvp_status: status,
      rsvp_at: now,
    })
    .eq("id", invite.id)
    .select("rsvp_status, rsvp_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: invite.org_id,
    actor_id: null,
    action: "pnm_event_rsvp",
    resource_type: "event_pnm_invites",
    resource_id: invite.id,
    metadata: { event_id: invite.event_id, status },
  });

  return NextResponse.json({ status: data.rsvp_status, rsvpAt: data.rsvp_at });
}
