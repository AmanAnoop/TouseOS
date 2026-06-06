import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: trip, error } = await supabase
    .from("greek_travel_trips")
    .select("*")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const [rsvps, legs, budget, checklist, documents, members] = await Promise.all([
    supabase.from("greek_trip_rsvps").select("*, member:member_id(id, full_name, profile_photo_url)").eq("trip_id", tripId),
    supabase.from("greek_trip_itinerary_legs").select("*").eq("trip_id", tripId).order("day").order("sort_order"),
    supabase.from("greek_trip_budget_items").select("*, payer:paid_by(full_name)").eq("trip_id", tripId),
    supabase.from("greek_trip_checklist_items").select("*").eq("trip_id", tripId).order("sort_order"),
    supabase.from("greek_trip_documents").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    supabase.from("member_profiles").select("id, full_name").eq("org_id", orgId).eq("membership_status", "active"),
  ]);

  return NextResponse.json({
    trip,
    rsvps: rsvps.data ?? [],
    legs: legs.data ?? [],
    budget: budget.data ?? [],
    checklist: checklist.data ?? [],
    documents: documents.data ?? [],
    members: members.data ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const { orgId, status, name, type, destination, departureLocation, startDate, endDate, estimatedAttendees, visibility } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (name) patch.name = name;
  if (type) patch.type = type;
  if (destination !== undefined) patch.destination = destination;
  if (departureLocation !== undefined) patch.departure_location = departureLocation;
  if (startDate) patch.start_date = startDate;
  if (endDate) patch.end_date = endDate;
  if (estimatedAttendees !== undefined) patch.estimated_attendees = estimatedAttendees;
  if (visibility) patch.visibility = visibility;

  const { data, error } = await supabase
    .from("greek_travel_trips")
    .update(patch)
    .eq("id", tripId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
