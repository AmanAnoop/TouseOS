import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("events")
    .select("*, event_rsvps(count)")
    .eq("org_id", orgId)
    .order("starts_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, title, type, description, location, startsAt, endsAt,
    rsvpEnabled, rsvpLimit, waitlistEnabled, showGuestList, alcohol,
    riskLevel, budgetAmount, dresscode, playlistUrl, theme, isPrivate,
  } = body;

  const { data, error } = await supabase.from("events").insert({
    org_id: orgId,
    created_by: user.id,
    title,
    type: type ?? "other",
    description,
    location,
    starts_at: startsAt,
    ends_at: endsAt,
    rsvp_enabled: rsvpEnabled ?? true,
    rsvp_limit: rsvpLimit,
    waitlist_enabled: waitlistEnabled ?? false,
    show_guest_list: showGuestList ?? false,
    alcohol: alcohol ?? false,
    risk_level: riskLevel ?? "low",
    budget_amount: budgetAmount,
    dress_code: dresscode,
    playlist_url: playlistUrl,
    theme,
    is_private: isPrivate ?? false,
    status: "upcoming",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "event_created",
    resource_type: "events",
    resource_id: data.id,
    metadata: { title, type, risk_level: riskLevel },
  });

  return NextResponse.json(data, { status: 201 });
}
