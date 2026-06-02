import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

function canManageHousing(role: RoleName): boolean {
  return can(role, "manage_housing") || can(role, "manage_org_settings");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, roomNumber, capacity, floor, monthlyRent, notes } = await request.json();
  if (!orgId || !roomNumber) {
    return NextResponse.json({ error: "orgId and roomNumber required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!canManageHousing(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("housing_rooms")
    .insert({
      org_id: orgId,
      room_number: String(roomNumber),
      capacity: capacity ? Number(capacity) : 1,
      floor: floor != null && floor !== "" ? Number(floor) : null,
      monthly_rent: monthlyRent ? Number(monthlyRent) : null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ room: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  const orgId = searchParams.get("orgId");
  if (!roomId || !orgId) {
    return NextResponse.json({ error: "roomId and orgId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!canManageHousing(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("housing_rooms").delete().eq("id", roomId).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
