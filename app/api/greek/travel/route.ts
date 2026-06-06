import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { starterChecklist } from "@/lib/travel-config";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("greek_travel_trips")
    .select("*")
    .eq("org_id", orgId)
    .order("start_date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, name, type, destination, departureLocation, venueName, address, meetingPoint,
    startDate, endDate, estimatedAttendees, visibility, templateId,
  } = body;
  if (!orgId || !name || !startDate) {
    return NextResponse.json({ error: "orgId, name, and startDate required" }, { status: 400 });
  }

  const { data: trip, error } = await supabase
    .from("greek_travel_trips")
    .insert({
      org_id: orgId,
      name,
      type: type || "other",
      destination: destination || null,
      departure_location: departureLocation || null,
      venue_name: venueName || null,
      address: address || null,
      meeting_point: meetingPoint || null,
      start_date: startDate,
      end_date: endDate || startDate,
      estimated_attendees: estimatedAttendees ?? 0,
      visibility: visibility || "all_members",
      status: "planning",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let checklistLabels = starterChecklist("greek", type || "other");
  if (templateId) {
    const { data: tmpl } = await supabase
      .from("greek_trip_templates")
      .select("checklist_items, itinerary_structure, budget_categories")
      .eq("id", templateId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (tmpl?.checklist_items && Array.isArray(tmpl.checklist_items)) {
      checklistLabels = tmpl.checklist_items as string[];
    }
  }

  if (checklistLabels.length) {
    await supabase.from("greek_trip_checklist_items").insert(
      checklistLabels.map((label: string, i: number) => ({
        trip_id: trip.id,
        label,
        sort_order: i,
      })),
    );
  }

  return NextResponse.json(trip, { status: 201 });
}
