import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const body = await request.json();
  const {
    orgId, action, legId, day, legType, title, location,
    startTime, endTime, notes, confirmationNumber,
  } = body;

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: trip } = await supabase
    .from("greek_travel_trips")
    .select("id")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (action === "delete" && legId) {
    const { error } = await supabase
      .from("greek_trip_itinerary_legs")
      .delete()
      .eq("id", legId)
      .eq("trip_id", tripId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "move" && legId && body.direction) {
    const { data: legs } = await supabase
      .from("greek_trip_itinerary_legs")
      .select("id, day, sort_order")
      .eq("trip_id", tripId)
      .order("day")
      .order("sort_order");

    const list = legs ?? [];
    const idx = list.findIndex((l) => l.id === legId);
    if (idx < 0) return NextResponse.json({ error: "Leg not found" }, { status: 404 });

    const swapIdx = body.direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) {
      return NextResponse.json({ success: true });
    }

    const a = list[idx];
    const b = list[swapIdx];
    await supabase.from("greek_trip_itinerary_legs").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("greek_trip_itinerary_legs").update({ sort_order: a.sort_order }).eq("id", b.id);
    return NextResponse.json({ success: true });
  }

  if (!legType || !title?.trim()) {
    return NextResponse.json({ error: "legType and title required" }, { status: 400 });
  }

  const { count } = await supabase
    .from("greek_trip_itinerary_legs")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  const { data, error } = await supabase.from("greek_trip_itinerary_legs").insert({
    trip_id: tripId,
    day: day ?? 1,
    sort_order: count ?? 0,
    leg_type: legType,
    details: { title: title.trim(), location: location || null, startTime: startTime || null, endTime: endTime || null, notes: notes || null },
    confirmation_number: confirmationNumber || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
