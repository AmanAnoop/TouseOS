import type { SupabaseClient } from "@supabase/supabase-js";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

export interface RentChargeResult {
  created: number;
  skipped: number;
  failed: number;
  message: string;
}

interface RentChargeOptions {
  dueDate?: string;
  monthLabel?: string;
  actorId?: string | null;
  /** When set, only charge assignments whose due day matches (cron). */
  filterDueDay?: number;
}

/** Create monthly rent payment charges for active housing assignments. */
export async function createHousingRentCharges(
  supabase: SupabaseClient,
  orgId: string,
  options: RentChargeOptions = {},
): Promise<RentChargeResult> {
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const rentCfg = (settings.housing_rent ?? {}) as Record<string, unknown>;
  const orgDueDay = Number(rentCfg.due_day ?? 1);

  const { data: rooms } = await supabase
    .from("housing_rooms")
    .select("id, room_number, monthly_rent")
    .eq("org_id", orgId)
    .not("monthly_rent", "is", null);

  const roomIds = (rooms ?? []).map((r) => r.id);
  if (roomIds.length === 0) {
    return { created: 0, skipped: 0, failed: 0, message: "No rooms with monthly rent set" };
  }

  const { data: assignments } = await supabase
    .from("housing_assignments")
    .select("id, member_id, room_id, rent_due_day")
    .in("room_id", roomIds)
    .is("move_out", null);

  if (!assignments?.length) {
    return { created: 0, skipped: 0, failed: 0, message: "No active room assignments" };
  }

  const roomById = new Map((rooms ?? []).map((r) => [r.id, r]));
  const label = options.monthLabel ?? new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const due = options.dueDate ?? new Date().toISOString().slice(0, 10);
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
    const memberDueDay = a.rent_due_day != null ? Number(a.rent_due_day) : orgDueDay;
    if (options.filterDueDay != null && memberDueDay !== options.filterDueDay) {
      continue;
    }

    const room = roomById.get(a.room_id);
    const rent = Number(room?.monthly_rent ?? 0);
    if (rent <= 0 || !a.member_id) continue;

    if (chargedMemberIds.has(String(a.member_id))) {
      skipped += 1;
      continue;
    }

    const assignmentDue = new Date(due);
    if (options.filterDueDay != null) {
      assignmentDue.setDate(memberDueDay);
    }
    const dueForMember = assignmentDue.toISOString().slice(0, 10);

    const title = `Rent — Room ${room?.room_number ?? "?"} ${periodSuffix}`;

    const { data: item, error: itemErr } = await supabase.from("payment_items").insert({
      org_id: orgId,
      title,
      category: "housing",
      amount: rent,
      due_date: dueForMember,
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
      due_date: dueForMember,
    });

    if (payErr) errors.push(payErr.message);
    else {
      created += 1;
      chargedMemberIds.add(String(a.member_id));
    }
  }

  if (options.actorId) {
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: options.actorId,
      action: "housing_rent_charges_created",
      resource_type: "housing_rooms",
      metadata: { created, skipped, due, label, errors: errors.length },
    });
  }

  if (created > 0) {
    void triggerBudgetSyncForOrg(orgId, options.actorId ?? undefined);
  }

  const allSkipped = skipped > 0 && created === 0 && errors.length === 0;
  const message = created > 0
    ? `Created ${created} rent charge(s) for ${label}.${skipped > 0 ? ` Skipped ${skipped} already billed.` : ""}`
    : allSkipped
      ? `Rent for ${label} was already posted for all assigned members.`
      : options.filterDueDay != null
        ? `No assignments due on day ${options.filterDueDay}.`
        : "No charges created";

  return { created, skipped, failed: errors.length, message };
}
