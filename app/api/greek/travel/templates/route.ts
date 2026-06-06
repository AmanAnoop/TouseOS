import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("greek_trip_templates")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, tripId, name } = await request.json();
  if (!orgId || !tripId || !name) {
    return NextResponse.json({ error: "orgId, tripId, and name required" }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from("greek_travel_trips")
    .select("*")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const [{ data: checklist }, { data: legs }, { data: budget }] = await Promise.all([
    supabase.from("greek_trip_checklist_items").select("label").eq("trip_id", tripId).order("sort_order"),
    supabase.from("greek_trip_itinerary_legs").select("leg_type, details").eq("trip_id", tripId).order("day").order("sort_order"),
    supabase.from("greek_trip_budget_items").select("category").eq("trip_id", tripId),
  ]);

  const categories = [...new Set((budget ?? []).map((b) => b.category))];

  const { data, error } = await supabase
    .from("greek_trip_templates")
    .insert({
      org_id: orgId,
      name,
      type: trip.type,
      checklist_items: (checklist ?? []).map((c) => c.label),
      itinerary_structure: (legs ?? []).map((l) => ({ legType: l.leg_type, details: l.details })),
      budget_categories: categories,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
