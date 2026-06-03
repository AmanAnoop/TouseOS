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
  const periodSuffix = `(${label})`;

  const { data: existingItems } = await supabase
    .from("payment_items")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("category", "housing")
    .like("title", `%${periodSuffix}`);

  const existingItemIds = (existingItems ?? []).map((i) => i.id);
  const chargedMemberIds = new Set<string>();

  if (existingItemIds.length > 0) {
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("member_id, payment_item_id")
      .eq("org_id", orgId)
      .in("payment_item_id", existingItemIds);

    for (const p of existingPayments ?? []) {
      if (p.member_id) chargedMemberIds.add(String(p.member_id));
    }
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const a of assignments) {
    const room = roomById.get(a.room_id);
    const rent = Number(room?.monthly_rent ?? 0);
    if (rent <= 0 || !a.member_id) continue;

    if (chargedMemberIds.has(String(a.member_id))) {
      skipped += 1;
      continue;
    }

    const title = `Rent — Room ${room?.room_number ?? "?"} ${periodSuffix}`;

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
    else {
      created += 1;
      chargedMemberIds.add(String(a.member_id));
    }
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "housing_rent_charges_created",
    resource_type: "housing_rooms",
    metadata: { created, skipped, due, label, errors: errors.length },
  });

  void triggerBudgetSyncForOrg(orgId, user.id);

  const allSkipped = skipped > 0 && created === 0 && errors.length === 0;

  return NextResponse.json({
    success: true,
    created,
    skipped,
    failed: errors.length,
    message: created > 0
      ? `Created ${created} rent charge(s) for ${label}.${skipped > 0 ? ` Skipped ${skipped} already billed.` : ""} Collected rent appears under Housing & rent on Budget.`
      : allSkipped
        ? `Rent for ${label} was already posted for all assigned members.`
        : "No charges created",
  });
}
