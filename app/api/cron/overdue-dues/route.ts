import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: toMark, error: fetchErr } = await supabase
    .from("payments")
    .select("id, org_id, member_id, amount, paid_amount, member_profiles(user_id)")
    .in("status", ["pending", "partial"])
    .lt("due_date", today)
    .not("due_date", "is", null);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const ids = (toMark ?? []).map((p) => p.id);
  if (ids.length === 0) {
    return NextResponse.json({ markedOverdue: 0, notified: 0, at: new Date().toISOString() });
  }

  const { error } = await supabase
    .from("payments")
    .update({ status: "overdue" })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const payment of toMark ?? []) {
    const profile = payment.member_profiles as { user_id?: string } | null;
    const userId = profile?.user_id;
    if (!userId) continue;
    const balance = Number(payment.amount) - Number(payment.paid_amount ?? 0);
    const { error: notifyErr } = await createNotification(supabase, {
      userId,
      orgId: String(payment.org_id),
      type: "payment_reminder",
      title: "Payment overdue",
      body: `You have an overdue balance of $${balance.toFixed(2)}.`,
      link: "/payments",
    });
    if (!notifyErr) notified += 1;
  }

  return NextResponse.json({
    markedOverdue: ids.length,
    notified,
    at: new Date().toISOString(),
  });
}
