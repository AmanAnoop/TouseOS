import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Aggregate housing data for an org (rooms, active assignments, recent maintenance). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: roomData, error: roomError } = await supabase
    .from("housing_rooms")
    .select("*")
    .eq("org_id", orgId)
    .order("room_number");

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

  const roomIds = (roomData ?? []).map((r) => r.id);
  const [assignRes, maintRes, contactsRes] = await Promise.all([
    roomIds.length
      ? supabase
          .from("housing_assignments")
          .select("*, member_profiles(full_name)")
          .in("room_id", roomIds)
          .is("move_out", null)
      : Promise.resolve({ data: [] }),
    supabase
      .from("maintenance_requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("housing_contacts")
      .select("*")
      .eq("org_id", orgId)
      .order("category")
      .order("name"),
  ]);

  return NextResponse.json({
    rooms: roomData ?? [],
    assignments: assignRes.data ?? [],
    maintenance: maintRes.data ?? [],
    contacts: contactsRes.data ?? [],
  });
}
