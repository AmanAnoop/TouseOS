import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";
import { computeTravelReadiness } from "@/lib/sports-travel-readiness";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (!m || getProductId(orgType) !== "sports") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: trip, error } = await supabase
    .from("sports_travel_trips")
    .select("*")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .single();

  if (error || !trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const [costsRes, rosterRes, membersRes, waiversRes] = await Promise.all([
    supabase.from("sports_trip_costs").select("*").eq("trip_id", tripId),
    supabase.from("sports_travel_roster").select("*, member_profiles(id, full_name, membership_status, payment_status, attendance_rate, is_injured)").eq("trip_id", tripId),
    supabase.from("member_profiles").select("id, full_name, membership_status, payment_status, attendance_rate, is_injured").eq("org_id", orgId).eq("membership_status", "active"),
    supabase.from("sports_waivers").select("member_id, waiver_type, status").eq("org_id", orgId).eq("status", "completed"),
  ]);

  const waiversByMember = new Map<string, string[]>();
  for (const w of waiversRes.data ?? []) {
    const mid = String(w.member_id);
    if (!waiversByMember.has(mid)) waiversByMember.set(mid, []);
    waiversByMember.get(mid)!.push(String(w.waiver_type));
  }

  const members = (membersRes.data ?? []).map((mem) => ({
    ...mem,
    completedWaiverTypes: waiversByMember.get(String(mem.id)) ?? [],
  }));

  const roster = rosterRes.data ?? [];
  const readiness = computeTravelReadiness({
    trip: { itinerary: trip.itinerary, total_cost: trip.total_cost },
    rosterCount: roster.length,
    confirmedCount: roster.filter((r) => r.confirmed).length,
    driversCount: roster.filter((r) => r.is_driver).length,
    hotelAssignedCount: roster.filter((r) => r.hotel_assignment).length,
    members: members.map((mem) => ({
      id: String(mem.id),
      full_name: String(mem.full_name),
      membership_status: String(mem.membership_status),
      payment_status: String(mem.payment_status),
      attendance_rate: Number(mem.attendance_rate ?? 0),
      is_injured: Boolean(mem.is_injured),
      completedWaiverTypes: waiversByMember.get(String(mem.id)) ?? [],
    })),
  });

  return NextResponse.json({
    trip,
    costs: costsRes.data ?? [],
    roster,
    availableMembers: members,
    readiness,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const body = await request.json();
  const {
    orgId, status, itinerary, packingList,
    destination, venueName, address, departureLocation, meetingPoint,
  } = body;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (getProductId(orgType) !== "sports" || !can(role, "manage_travel")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("sports_travel_trips")
    .update({
      ...(status ? { status } : {}),
      ...(itinerary !== undefined ? { itinerary } : {}),
      ...(packingList !== undefined ? { packing_list: packingList } : {}),
      ...(destination !== undefined ? { destination } : {}),
      ...(venueName !== undefined ? { venue_name: venueName } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(departureLocation !== undefined ? { departure_location: departureLocation } : {}),
      ...(meetingPoint !== undefined ? { meeting_point: meetingPoint } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
