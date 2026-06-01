import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

function monthsSince(iso: string | null): number {
  if (!iso) return 999;
  const then = new Date(iso);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data: items, error } = await supabase
    .from("payment_items")
    .select("id, org_id, title, amount, category, due_date, recurring_interval, last_recurring_at")
    .eq("recurring", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let generated = 0;

  for (const item of items ?? []) {
    const interval = item.recurring_interval ?? "semesterly";
    const minMonths =
      interval === "weekly" ? 0 :
      interval === "monthly" ? 1 :
      interval === "annually" ? 12 : 4;

    if (monthsSince(item.last_recurring_at) < minMonths) continue;

    const { data: members } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", item.org_id)
      .in("membership_status", ["active", "new_member"]);

    if (!members?.length) continue;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const rows = members.map((m) => ({
      org_id: item.org_id,
      member_id: m.id,
      payment_item_id: item.id,
      amount: Number(item.amount),
      paid_amount: 0,
      status: "pending" as const,
      due_date: dueDate.toISOString().slice(0, 10),
    }));

    const { error: insertErr } = await supabase.from("payments").insert(rows);
    if (insertErr) continue;

    await supabase
      .from("payment_items")
      .update({ last_recurring_at: new Date().toISOString() })
      .eq("id", item.id);

    generated += rows.length;
  }

  return NextResponse.json({
    generated,
    itemsProcessed: items?.length ?? 0,
    at: new Date().toISOString(),
  });
}
