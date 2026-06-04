import { NextResponse } from "next/server";
import { requireFinanceOfficer, getServiceDb } from "@/lib/finance-api";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const { orgId, paymentIds } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const auth = await requireFinanceOfficer(String(orgId));
  if (!auth.ok) return auth.response;

  const service = await getServiceDb();

  let query = service
    .from("payments")
    .select("id, amount, paid_amount, status, member_profiles(user_id, full_name)")
    .eq("org_id", orgId)
    .in("status", ["pending", "overdue", "partial"]);

  if (Array.isArray(paymentIds) && paymentIds.length) {
    query = query.in("id", paymentIds);
  }

  const { data: unpaid, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const p of unpaid ?? []) {
    const mp = Array.isArray(p.member_profiles) ? p.member_profiles[0] : p.member_profiles;
    const userId = mp?.user_id as string | undefined;
    if (!userId) continue;
    const owed = Number(p.amount) - Number(p.paid_amount);
    await createNotification(service, {
      userId,
      orgId: String(orgId),
      type: "payment_reminder",
      title: "Dues reminder",
      body: `You have ${owed > 0 ? `$${owed.toFixed(2)}` : "an balance"} due. Tap to pay.`,
      link: "/payments",
    });
    sent += 1;
  }

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: auth.userId,
    action: "dues_reminders_sent",
    resource_type: "payments",
    metadata: { count: sent },
  });

  return NextResponse.json({ sent });
}
