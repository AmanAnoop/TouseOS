import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
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
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_travel") && !can(role, "manage_payments")) {
    return NextResponse.json({ error: "Travel or finance officer access required" }, { status: 403 });
  }

  const { data: trip } = await supabase
    .from("greek_travel_trips")
    .select("id, name, cost_per_member, start_date, total_budget")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .single();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const { data: attendingRsvps } = await supabase
    .from("greek_trip_rsvps")
    .select("member_id, status")
    .eq("trip_id", tripId)
    .eq("status", "attending");

  let memberIds = (attendingRsvps ?? []).map((r) => String(r.member_id)).filter(Boolean);
  if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
    const allowed = new Set(memberIds);
    memberIds = (body.memberIds as unknown[]).map(String).filter((id: string) => allowed.has(id));
  }

  const attendingCount = memberIds.length;
  const amountPerMember = Number(
    body.amountPerMember
    ?? trip.cost_per_member
    ?? (attendingCount > 0 && trip.total_budget ? Number(trip.total_budget) / attendingCount : 0),
  );

  if (!amountPerMember || Number.isNaN(amountPerMember) || amountPerMember <= 0) {
    return NextResponse.json({
      error: "Set a per-member cost on the trip or add budget items first",
    }, { status: 400 });
  }

  if (memberIds.length === 0) {
    return NextResponse.json({ error: "No members marked as attending — collect RSVPs first" }, { status: 400 });
  }

  const dueDate = (body.dueDate as string | undefined)
    ?? (trip.start_date ? String(trip.start_date) : undefined)
    ?? new Date().toISOString().slice(0, 10);
  const lateFee = Math.max(0, Number(body.lateFee ?? 0));
  const title = String(body.title ?? `Travel — ${trip.name}`).trim();

  const service = await getServiceDb();

  const { data: existingItem } = await service
    .from("payment_items")
    .select("id")
    .eq("org_id", orgId)
    .eq("greek_trip_id", tripId)
    .maybeSingle();

  let paymentItemId = existingItem?.id as string | undefined;
  if (!paymentItemId) {
    const { data: item, error: itemErr } = await service.from("payment_items").insert({
      org_id: orgId,
      title,
      amount: amountPerMember,
      category: "travel",
      due_date: dueDate,
      greek_trip_id: tripId,
    }).select("id").single();
    if (itemErr || !item) {
      return NextResponse.json({ error: itemErr?.message ?? "Failed to create charge" }, { status: 500 });
    }
    paymentItemId = item.id;
  } else {
    await service.from("payment_items").update({
      amount: amountPerMember,
      due_date: dueDate,
      title,
    }).eq("id", paymentItemId);
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
      amount: amountPerMember,
      paid_amount: 0,
      status: "pending" as const,
      due_date: dueDate,
      late_fee: lateFee,
    }));

    const { error: payErr } = await service.from("payments").insert(rows);
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });
  }

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "greek_travel_charges_pushed",
    resource_type: "greek_travel_trips",
    resource_id: tripId,
    metadata: { title, amountPerMember, charged: toCharge.length, skipped },
  });

  void triggerBudgetSyncForOrg(orgId, user.id);

  return NextResponse.json({
    success: true,
    paymentItemId,
    membersCharged: toCharge.length,
    skipped,
    amountPerMember,
    message: toCharge.length > 0
      ? `Charged ${toCharge.length} member(s) at $${amountPerMember.toFixed(2)} each.${skipped > 0 ? ` Skipped ${skipped} already charged.` : ""}`
      : skipped > 0
        ? "All attending members were already charged for this trip."
        : "No charges created",
  }, { status: toCharge.length > 0 ? 201 : 200 });
}
