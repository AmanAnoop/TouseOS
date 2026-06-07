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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = tomorrow.toISOString().slice(0, 10);
  const end = new Date(tomorrow);
  end.setDate(end.getDate() + 1);
  const endStr = end.toISOString().slice(0, 10);

  const { data: events, error } = await supabase
    .from("events")
    .select("id, org_id, title, starts_at")
    .gte("starts_at", `${start}T00:00:00`)
    .lt("starts_at", `${endStr}T00:00:00`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const event of events ?? []) {
    const { data: members } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", event.org_id)
      .eq("status", "active");

    for (const m of members ?? []) {
      const { error: notifyErr } = await createNotification(supabase, {
        userId: String(m.user_id),
        orgId: String(event.org_id),
        type: "event_reminder",
        title: `Tomorrow: ${event.title}`,
        body: `Starts ${String(event.starts_at).slice(0, 16).replace("T", " ")}`,
        link: `/events/${event.id}`,
      });
      if (!notifyErr) notified += 1;
    }
  }

  return NextResponse.json({ notified, events: events?.length ?? 0, at: new Date().toISOString() });
}
