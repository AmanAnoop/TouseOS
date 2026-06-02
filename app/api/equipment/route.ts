import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, action } = body;

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_equipment") && !can(role, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "add_item") {
    const { itemName, category, quantityTotal, storageLocation, notes } = body;
    const qty = Math.max(1, parseInt(String(quantityTotal), 10) || 1);
    const { data, error } = await supabase.from("sports_equipment").insert({
      org_id: orgId,
      item_name: itemName,
      category: category ?? "equipment",
      quantity_total: qty,
      quantity_available: qty,
      storage_location: storageLocation || null,
      notes: notes || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  }

  if (action === "issue") {
    const { equipmentId, memberId, jerseyNumber, uniformSize } = body;
    const { data: equip } = await supabase
      .from("sports_equipment")
      .select("quantity_available")
      .eq("id", equipmentId)
      .single();

    if (!equip || Number(equip.quantity_available) < 1) {
      return NextResponse.json({ error: "No units available" }, { status: 400 });
    }

    const { data: assignment, error } = await supabase
      .from("sports_equipment_assignments")
      .insert({
        equipment_id: equipmentId,
        member_id: memberId,
        jersey_number: jerseyNumber || null,
        uniform_size: uniformSize || null,
        condition: "good",
      })
      .select("*, member_profiles(full_name), sports_equipment(item_name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase
      .from("sports_equipment")
      .update({ quantity_available: Number(equip.quantity_available) - 1 })
      .eq("id", equipmentId);

    return NextResponse.json({ assignment }, { status: 201 });
  }

  if (action === "return") {
    const { assignmentId, condition } = body;
    const { data: a } = await supabase
      .from("sports_equipment_assignments")
      .select("equipment_id")
      .eq("id", assignmentId)
      .single();

    if (!a) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const { error } = await supabase
      .from("sports_equipment_assignments")
      .update({
        returned_at: new Date().toISOString(),
        condition: condition ?? "good",
      })
      .eq("id", assignmentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: equip } = await supabase
      .from("sports_equipment")
      .select("quantity_available")
      .eq("id", a.equipment_id)
      .single();

    if (equip) {
      await supabase
        .from("sports_equipment")
        .update({ quantity_available: Number(equip.quantity_available) + 1 })
        .eq("id", a.equipment_id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
