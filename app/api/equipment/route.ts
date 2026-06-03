import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function getRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, orgId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: items, error } = await supabase
    .from("sports_equipment")
    .select("*")
    .eq("org_id", orgId)
    .order("item_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (items ?? []).map((i) => i.id);
  let assignments: unknown[] = [];
  if (ids.length > 0) {
    const { data: assigns } = await supabase
      .from("sports_equipment_assignments")
      .select("*, member_profiles(full_name), sports_equipment(item_name)")
      .in("equipment_id", ids)
      .is("returned_at", null);
    assignments = assigns ?? [];
  }

  const { data: members } = await supabase
    .from("member_profiles")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("membership_status", "active");

  return NextResponse.json({
    equipment: items ?? [],
    assignments,
    members: members ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, action } = body;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getRole(supabase, user.id, orgId);
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
    const result = await issueOne(supabase, equipmentId, memberId, jerseyNumber, uniformSize);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 201 });
  }

  if (action === "issue_bulk") {
    const { equipmentId, memberIds, jerseyNumber, uniformSize } = body;
    if (!equipmentId || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "equipmentId and memberIds required" }, { status: 400 });
    }

    const { data: equip } = await supabase
      .from("sports_equipment")
      .select("quantity_available, item_name")
      .eq("id", equipmentId)
      .single();

    if (!equip) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

    const available = Number(equip.quantity_available);
    const toIssue = memberIds.slice(0, available);
    if (toIssue.length === 0) {
      return NextResponse.json({ error: "No units available" }, { status: 400 });
    }

    const issued: unknown[] = [];
    const errors: string[] = [];

    for (const memberId of toIssue) {
      const result = await issueOne(supabase, equipmentId, memberId, jerseyNumber, uniformSize);
      if ("error" in result) errors.push(result.error);
      else issued.push(result.assignment);
    }

    return NextResponse.json({
      issued: issued.length,
      skipped: memberIds.length - toIssue.length,
      errors,
      itemName: equip.item_name,
    }, { status: 201 });
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

  if (action === "return_bulk") {
    const { assignmentIds } = body;
    if (!Array.isArray(assignmentIds)) {
      return NextResponse.json({ error: "assignmentIds required" }, { status: 400 });
    }
    let count = 0;
    for (const assignmentId of assignmentIds) {
      const { data: a } = await supabase
        .from("sports_equipment_assignments")
        .select("equipment_id")
        .eq("id", assignmentId)
        .maybeSingle();
      if (!a) continue;
      await supabase
        .from("sports_equipment_assignments")
        .update({ returned_at: new Date().toISOString(), condition: "good" })
        .eq("id", assignmentId);
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
      count += 1;
    }
    return NextResponse.json({ returned: count });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function issueOne(
  supabase: Awaited<ReturnType<typeof createClient>>,
  equipmentId: string,
  memberId: string,
  jerseyNumber?: string,
  uniformSize?: string,
): Promise<{ assignment: unknown } | { error: string; status: number }> {
  const { data: equip } = await supabase
    .from("sports_equipment")
    .select("quantity_available")
    .eq("id", equipmentId)
    .single();

  if (!equip || Number(equip.quantity_available) < 1) {
    return { error: "No units available", status: 400 };
  }

  const { data: existing } = await supabase
    .from("sports_equipment_assignments")
    .select("id")
    .eq("equipment_id", equipmentId)
    .eq("member_id", memberId)
    .is("returned_at", null)
    .maybeSingle();

  if (existing) {
    return { error: "Member already has this item", status: 409 };
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

  if (error) return { error: error.message, status: 500 };

  await supabase
    .from("sports_equipment")
    .update({ quantity_available: Number(equip.quantity_available) - 1 })
    .eq("id", equipmentId);

  return { assignment };
}
