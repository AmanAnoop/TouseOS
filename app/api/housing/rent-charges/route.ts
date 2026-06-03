import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

/** Create monthly rent payment charges for all active housing assignments. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, dueDate, monthLabel } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: rooms } = await supabase
    .from("housing_rooms")
    .select("id, room_number, monthly_rent")
    .eq("org_id", orgId)
    .not("monthly_rent", "is", null);

  const roomIds = (rooms ?? []).map((r) => r.id);
  if (roomIds.length === 0) {
    return NextResponse.json({ error: "No rooms with monthly rent set" }, { status: 400 });
  }

  const { data: assignments } = await supabase
    .from("housing_assignments")
    .select("id, member_id, room_id")
    .in("room_id", roomIds)
    .is("move_out", null);

  if (!assignments?.length) {
    return NextResponse.json({ error: "No active room assignments" }, { status: 400 });
  }

  const roomById = new Map((rooms ?? []).map((r) => [r.id, r]));
  const label = monthLabel ?? new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const due = dueDate ?? new Date().toISOString().slice(0, 10);

  let created = 0;
  const errors: string[] = [];

  for (const a of assignments) {
    const room = roomById.get(a.room_id);
    const rent = Number(room?.monthly_rent ?? 0);
    if (rent <= 0 || !a.member_id) continue;

    const title = `Rent — Room ${room?.room_number ?? "?"} (${label})`;

    const { data: item, error: itemErr } = await supabase.from("payment_items").insert({
      org_id: orgId,
      title,
      category: "housing",
      amount: rent,
      due_date: due,
    }).select("id").single();

    if (itemErr || !item) {
      errors.push(itemErr?.message ?? "item failed");
      continue;
    }

    const { error: payErr } = await supabase.from("payments").insert({
      org_id: orgId,
      member_id: a.member_id,
      payment_item_id: item.id,
      amount: rent,
      paid_amount: 0,
      status: "pending",
      due_date: due,
    });

    if (payErr) errors.push(payErr.message);
    else created += 1;
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "housing_rent_charges_created",
    resource_type: "housing_rooms",
    metadata: { created, due, label, errors: errors.length },
  });

  void triggerBudgetSyncForOrg(orgId, user.id);

  return NextResponse.json({
    success: true,
    created,
    skipped: errors.length,
    message: created > 0
      ? `Created ${created} rent charge(s). Collected rent will appear under Housing & rent on Budget.`
      : "No charges created",
  });
}
