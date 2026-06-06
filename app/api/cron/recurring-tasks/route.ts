import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: completed, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("is_recurring", true)
    .eq("status", "done")
    .gte("completed_at", since);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let cloned = 0;
  for (const task of completed ?? []) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("org_id", task.org_id)
      .eq("title", task.title)
      .in("status", ["todo", "in_progress"])
      .gte("created_at", since)
      .limit(1);

    if (existing?.length) continue;

    const dueDate = task.due_date
      ? new Date(new Date(String(task.due_date)).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;

    const { error: insertErr } = await supabase.from("tasks").insert({
      org_id: task.org_id,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: task.priority,
      due_date: dueDate,
      assigned_to: task.assigned_to,
      assignee_name: task.assignee_name,
      tags: task.tags,
      is_recurring: true,
      created_by: task.created_by,
    });

    if (!insertErr) cloned += 1;
  }

  return NextResponse.json({ cloned, scanned: completed?.length ?? 0, at: new Date().toISOString() });
}
