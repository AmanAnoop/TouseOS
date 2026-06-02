import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const { orgId, memberId, action, hotelAssignment, carpoolAssignment, isDriver, confirmed } = await request.json();

  if (!orgId || !memberId || !action) {
    return NextResponse.json({ error: "orgId, memberId, action required" }, { status: 400 });
  }

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

  if (action === "remove") {
    await supabase.from("sports_travel_roster").delete().eq("trip_id", tripId).eq("member_id", memberId);
    return NextResponse.json({ ok: true });
  }

  if (action === "add") {
    const { data, error } = await supabase
      .from("sports_travel_roster")
      .upsert({
        trip_id: tripId,
        member_id: memberId,
        confirmed: false,
      }, { onConflict: "trip_id,member_id" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("sports_travel_roster")
    .update({
      ...(hotelAssignment !== undefined ? { hotel_assignment: hotelAssignment } : {}),
      ...(carpoolAssignment !== undefined ? { carpool_assignment: carpoolAssignment } : {}),
      ...(isDriver !== undefined ? { is_driver: isDriver } : {}),
      ...(confirmed !== undefined ? { confirmed: confirmed } : {}),
    })
    .eq("trip_id", tripId)
    .eq("member_id", memberId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
