import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/** Public PNM event invite metadata by token (no auth). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createServiceClient();
  const { data: invite, error } = await supabase
    .from("event_pnm_invites")
    .select(`
      id,
      rsvp_status,
      rsvp_at,
      checked_in,
      pnm_id,
      pnm_leads ( full_name ),
      events (
        id,
        title,
        description,
        starts_at,
        ends_at,
        location,
        address,
        dress_code,
        cover_image_url,
        rsvp_enabled,
        type,
        org_id,
        organizations ( name, logo_url, primary_color )
      )
    `)
    .eq("invite_token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  function unwrap<T>(value: T | T[] | null | undefined): T | null {
    if (value == null) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
  }

  const event = unwrap(invite.events as Record<string, unknown> | Record<string, unknown>[] | null);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const pnm = unwrap(invite.pnm_leads as { full_name?: string } | { full_name?: string }[] | null);
  const org = unwrap(event.organizations as Record<string, unknown> | Record<string, unknown>[] | null);

  return NextResponse.json({
    invite: {
      id: invite.id,
      rsvpStatus: invite.rsvp_status,
      rsvpAt: invite.rsvp_at,
      checkedIn: invite.checked_in,
      pnmFirstName: pnm?.full_name?.split(" ")[0] ?? "there",
    },
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      location: event.location,
      address: event.address,
      dressCode: event.dress_code,
      coverImageUrl: event.cover_image_url,
      type: event.type,
      isPast: new Date(String(event.starts_at)) < new Date(),
    },
    org: org
      ? { name: org.name, logoUrl: org.logo_url, primaryColor: org.primary_color }
      : null,
  });
}
