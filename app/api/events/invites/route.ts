import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { generatePnmInviteToken, pnmInviteUrl } from "@/lib/pnm-invite";
import { isTwilioConfigured } from "@/lib/integrations";
import { sendSms, isWithinQuietHours } from "@/lib/twilio";

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
    .select("pnm_id, invite_token, rsvp_status, rsvp_at, checked_in, checked_in_at")
    .eq("event_id", eventId)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const invites = (data ?? []).map((row) => ({
    pnmId: row.pnm_id,
    inviteToken: row.invite_token,
    inviteUrl: row.invite_token ? pnmInviteUrl(row.invite_token, baseUrl) : null,
    rsvpStatus: row.rsvp_status ?? "pending",
    rsvpAt: row.rsvp_at,
    checkedIn: row.checked_in ?? false,
    checkedInAt: row.checked_in_at,
  }));

  return NextResponse.json({
    pnmIds: invites.map((i) => i.pnmId),
    invites,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, eventId, pnmIds, notifySms } = await request.json();
  if (!orgId || !eventId || !Array.isArray(pnmIds)) {
    return NextResponse.json({ error: "orgId, eventId, and pnmIds required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_recruitment") && !can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("event_pnm_invites")
    .select("pnm_id, invite_token, rsvp_status, rsvp_at, checked_in, checked_in_at")
    .eq("event_id", eventId)
    .eq("org_id", orgId);

  const existingByPnm = new Map((existing ?? []).map((r) => [r.pnm_id, r]));
  const nextIds = new Set(pnmIds as string[]);

  const toRemove = (existing ?? []).filter((r) => !nextIds.has(r.pnm_id)).map((r) => r.pnm_id);
  if (toRemove.length > 0) {
    await supabase
      .from("event_pnm_invites")
      .delete()
      .eq("event_id", eventId)
      .eq("org_id", orgId)
      .in("pnm_id", toRemove);
  }

  const toAdd = (pnmIds as string[]).filter((id) => !existingByPnm.has(id));
  if (toAdd.length > 0) {
    const rows = toAdd.map((pnmId) => ({
      event_id: eventId,
      org_id: orgId,
      pnm_id: pnmId,
      invite_token: generatePnmInviteToken(),
      rsvp_status: "pending",
    }));
    const { error } = await supabase.from("event_pnm_invites").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let smsSent = 0;
  if (notifySms && toAdd.length > 0 && isTwilioConfigured() && !isWithinQuietHours(new Date())) {
    const [{ data: event }, { data: leads }] = await Promise.all([
      supabase.from("events").select("title, starts_at").eq("id", eventId).single(),
      supabase
        .from("pnm_leads")
        .select("id, phone, full_name, communication_consent, opted_out")
        .eq("org_id", orgId)
        .in("id", toAdd),
    ]);

    const { data: newInvites } = await supabase
      .from("event_pnm_invites")
      .select("pnm_id, invite_token")
      .eq("event_id", eventId)
      .eq("org_id", orgId)
      .in("pnm_id", toAdd);

    const tokenByPnm = new Map((newInvites ?? []).map((i) => [i.pnm_id, i.invite_token]));
    const eventTitle = String(event?.title ?? "chapter event");
    const when = event?.starts_at
      ? new Date(String(event.starts_at)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : "";

    for (const lead of leads ?? []) {
      if (!lead.communication_consent || lead.opted_out || !lead.phone) continue;
      const token = tokenByPnm.get(lead.id);
      if (!token) continue;
      const link = pnmInviteUrl(token);
      const body = `Hi ${lead.full_name.split(" ")[0]}, you're invited to ${eventTitle}${when ? ` on ${when}` : ""}. RSVP: ${link}`;
      const result = await sendSms(lead.phone, body);
      if (result.status !== "failed") smsSent += 1;
    }
  }

  return NextResponse.json({ success: true, count: pnmIds.length, added: toAdd.length, smsSent });
}
