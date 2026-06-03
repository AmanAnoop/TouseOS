import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!profile) return NextResponse.json({ status: null });

  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("member_id", profile.id)
    .maybeSingle();

  return NextResponse.json({ status: rsvp?.status ?? null, memberId: profile.id });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, orgId, status, capacity, goingCount } = await request.json();
  if (!eventId || !orgId || !status) {
    return NextResponse.json({ error: "eventId, orgId, and status required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found for this organization" }, { status: 404 });
  }

  let finalStatus = status;
  if (capacity && status === "going" && typeof goingCount === "number" && goingCount >= capacity) {
    finalStatus = "waitlist";
  }

  const { data, error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        event_id: eventId,
        member_id: profile.id,
        user_id: user.id,
        status: finalStatus,
      },
      { onConflict: "event_id,member_id" },
    )
    .select("status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: data.status, waitlisted: finalStatus === "waitlist" && status === "going" });
}
