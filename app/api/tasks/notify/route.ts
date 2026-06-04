import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyTaskAssigneesViaSms } from "@/lib/task-sms";

/** POST — send task assignment reminder SMS to assignees (Twilio). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, taskId } = await request.json();
  if (!orgId || !taskId) {
    return NextResponse.json({ error: "orgId and taskId required" }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, org_id, title, due_date, priority")
    .eq("id", taskId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const sms = await notifyTaskAssigneesViaSms(supabase, {
    orgId,
    taskId,
    title: task.title,
    dueDate: task.due_date,
    priority: task.priority,
    actorId: user.id,
  });

  if (sms.sent === 0 && sms.message) {
    const status = sms.message.includes("not configured") ? 503 : 400;
    return NextResponse.json({ ...sms }, { status });
  }

  return NextResponse.json(sms);
}
