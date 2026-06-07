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
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: posts, error } = await supabase
    .from("social_calendar")
    .select("id, org_id, title, scheduled_date")
    .eq("status", "scheduled")
    .eq("scheduled_date", tomorrowStr);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const post of posts ?? []) {
    const { data: officers } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", post.org_id)
      .in("role", ["owner", "president", "vice_president", "social_chair"])
      .neq("status", "removed");

    for (const officer of officers ?? []) {
      const { error: notifyErr } = await createNotification(supabase, {
        userId: String(officer.user_id),
        orgId: String(post.org_id),
        type: "social_calendar",
        title: `Post tomorrow: ${post.title}`,
        body: `Scheduled for ${post.scheduled_date}`,
        link: "/social-calendar",
      });
      if (!notifyErr) notified += 1;
    }
  }

  return NextResponse.json({ notified, posts: posts?.length ?? 0, at: new Date().toISOString() });
}
