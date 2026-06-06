import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";
import { getServiceDb } from "@/lib/finance-api";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const body = await request.json();
  const orgId = String(body.orgId ?? "");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

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

  const role = String(m?.role ?? "general_member") as RoleName;
  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (getProductId(orgType) !== "sports") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!can(role, "manage_travel") && !can(role, "manage_payments")) {
    return NextResponse.json({ error: "Travel or finance officer access required" }, { status: 403 });
  }

  const { data: trip } = await supabase
    .from("sports_travel_trips")
    .select("id, title, cost_per_player, departure_date")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .single();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const amountPerPlayer = Number(body.amountPerPlayer ?? trip.cost_per_player ?? 0);
  if (!amountPerPlayer || Number.isNaN(amountPerPlayer) || amountPerPlayer <= 0) {
    return NextResponse.json({ error: "Save trip budget with a per-player cost first" }, { status: 400 });
  }

  const dueDate = (body.dueDate as string | undefined)
    ?? (trip.departure_date ? String(trip.departure_date) : undefined)
    ?? new Date().toISOString().slice(0, 10);
  const lateFee = Math.max(0, Number(body.lateFee ?? 0));
  const title = String(body.title ?? `Travel — ${trip.title}`).trim();

  const { data: roster } = await supabase
    .from("sports_travel_roster")
    .select("member_id")
    .eq("trip_id", tripId);

  let memberIds = (roster ?? []).map((r) => String(r.member_id)).filter(Boolean);
  if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
    const allowed = new Set(memberIds);
    memberIds = (body.memberIds as unknown[]).map(String).filter((id: string) => allowed.has(id));
  }
  if (memberIds.length === 0) {
    return NextResponse.json({ error: "Add players to the travel roster first" }, { status: 400 });
  }

  const service = await getServiceDb();

  const { data: existingItem } = await service
    .from("payment_items")
    .select("id")
    .eq("org_id", orgId)
    .eq("trip_id", tripId)
    .maybeSingle();

  let paymentItemId = existingItem?.id as string | undefined;
  if (!paymentItemId) {
    const { data: item, error: itemErr } = await service.from("payment_items").insert({
      org_id: orgId,
      title,
      amount: amountPerPlayer,
      category: "travel",
      due_date: dueDate,
      trip_id: tripId,
    }).select("id").single();
    if (itemErr || !item) {
      return NextResponse.json({ error: itemErr?.message ?? "Failed to create charge" }, { status: 500 });
    }
    paymentItemId = item.id;
  }

  const { data: existingPayments } = await service
    .from("payments")
    .select("member_id")
    .eq("org_id", orgId)
    .eq("payment_item_id", paymentItemId);

  const alreadyCharged = new Set((existingPayments ?? []).map((p) => String(p.member_id)));
  const toCharge = memberIds.filter((id) => !alreadyCharged.has(id));
  const skipped = memberIds.length - toCharge.length;

  if (toCharge.length > 0) {
    const rows = toCharge.map((memberId) => ({
      org_id: orgId,
      member_id: memberId,
      payment_item_id: paymentItemId,
      amount: amountPerPlayer,
      paid_amount: 0,
      status: "pending" as const,
      due_date: dueDate,
      late_fee: lateFee,
    }));

    const { error: payErr } = await service.from("payments").insert(rows);
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    await service
      .from("sports_travel_roster")
      .update({ payment_status: "pending" })
      .eq("trip_id", tripId)
      .in("member_id", toCharge);
  }

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "travel_charges_pushed",
    resource_type: "sports_travel_trips",
    resource_id: tripId,
    metadata: { title, amountPerPlayer, charged: toCharge.length, skipped },
  });

  void triggerBudgetSyncForOrg(orgId, user.id);

  return NextResponse.json({
    success: true,
    paymentItemId,
    membersCharged: toCharge.length,
    skipped,
    amountPerPlayer,
    message: toCharge.length > 0
      ? `Charged ${toCharge.length} player(s) at $${amountPerPlayer.toFixed(2)} each.${skipped > 0 ? ` Skipped ${skipped} already charged.` : ""}`
      : skipped > 0
        ? "All roster players were already charged for this trip."
        : "No charges created",
  }, { status: toCharge.length > 0 ? 201 : 200 });
}
