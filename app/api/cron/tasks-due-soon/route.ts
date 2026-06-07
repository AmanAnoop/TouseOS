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
  const today = new Date();
  const inThree = new Date(today);
  inThree.setDate(inThree.getDate() + 3);
  const todayStr = today.toISOString().slice(0, 10);
  const inThreeStr = inThree.toISOString().slice(0, 10);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, org_id, title, due_date, assigned_to")
    .not("status", "in", '("done","cancelled")')
    .gte("due_date", todayStr)
    .lte("due_date", inThreeStr);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const task of tasks ?? []) {
    const userIds = new Set<string>();
    if (task.assigned_to) userIds.add(String(task.assigned_to));

    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    for (const a of assignees ?? []) {
      if (a.user_id) userIds.add(String(a.user_id));
    }

    for (const userId of userIds) {
      const { data: recent } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "task_due")
        .gte("created_at", since)
        .ilike("title", `%${task.title}%`)
        .limit(1);

      if (recent?.length) continue;

      const { error: notifyErr } = await createNotification(supabase, {
        userId,
        orgId: String(task.org_id),
        type: "task_due",
        title: `Task due soon: ${task.title}`,
        body: task.due_date ? `Due ${task.due_date}` : undefined,
        link: "/tasks",
      });
      if (!notifyErr) notified += 1;
    }
  }

  return NextResponse.json({ notified, tasksScanned: tasks?.length ?? 0, at: new Date().toISOString() });
}
