import type { SupabaseClient } from "@supabase/supabase-js";
import { isTwilioConfigured } from "@/lib/integrations";
import { isWithinQuietHours, sendMassSms } from "@/lib/twilio";

export interface TaskSmsNotifyResult {
  sent: number;
  failed: number;
  skipped: number;
  message?: string;
}

function taskSmsBody(opts: {
  title: string;
  dueDate?: string | null;
  priority?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const due = opts.dueDate ? ` Due ${opts.dueDate}.` : "";
  const link = appUrl ? ` ${appUrl}/tasks` : "";
  return (
    `New task: "${opts.title}".${due}`
    + (opts.priority && opts.priority !== "medium" ? ` Priority: ${opts.priority}.` : "")
    + link
  ).trim();
}

/** Text all assignees with a phone on file. */
export async function notifyTaskAssigneesViaSms(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    taskId: string;
    title: string;
    dueDate?: string | null;
    priority?: string;
    actorId?: string;
    memberIds?: string[];
    userIds?: string[];
  },
): Promise<TaskSmsNotifyResult> {
  if (!isTwilioConfigured()) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      message: "Twilio is not configured. Add TWILIO_* keys in Settings → Integrations.",
    };
  }

  if (isWithinQuietHours(new Date())) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      message: "Quiet hours (9pm–9am). Task was saved; SMS was not sent.",
    };
  }

  const memberIds = new Set(params.memberIds ?? []);
  const userIds = new Set(params.userIds ?? []);

  if (memberIds.size === 0 && userIds.size === 0) {
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("member_id, user_id")
      .eq("task_id", params.taskId);
    for (const row of assignees ?? []) {
      if (row.member_id) memberIds.add(String(row.member_id));
      if (row.user_id) userIds.add(String(row.user_id));
    }
    const { data: task } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", params.taskId)
      .maybeSingle();
    if (task?.assigned_to) userIds.add(String(task.assigned_to));
  }

  let query = supabase
    .from("member_profiles")
    .select("id, user_id, full_name, phone")
    .eq("org_id", params.orgId)
    .not("phone", "is", null);

  if (memberIds.size > 0) {
    query = query.in("id", [...memberIds]);
  } else if (userIds.size > 0) {
    query = query.in("user_id", [...userIds]);
  } else {
    return { sent: 0, failed: 0, skipped: 0, message: "No assignees to notify" };
  }

  const { data: members } = await query;
  const recipients = (members ?? [])
    .filter((m) => m.phone && String(m.phone).trim())
    .map((m) => ({ phone: String(m.phone).trim(), name: String(m.full_name ?? "Member") }));

  if (recipients.length === 0) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      message: "Assignees have no phone numbers on their roster profiles.",
    };
  }

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", params.orgId)
    .maybeSingle();

  const body = taskSmsBody({
    title: params.title,
    dueDate: params.dueDate,
    priority: params.priority,
  });
  const orgName = orgRow?.name ? String(orgRow.name) : undefined;

  const results = await sendMassSms(recipients, body, undefined, { orgName });
  const sent = results.filter((r) => r.status !== "failed" && !r.error).length;
  const failed = results.length - sent;

  if (params.actorId) {
    await supabase.from("audit_logs").insert({
      org_id: params.orgId,
      actor_id: params.actorId,
      action: "task_sms_sent",
      resource_type: "tasks",
      resource_id: params.taskId,
      metadata: { recipient_count: recipients.length, sent, failed },
    });
  }

  return {
    sent,
    failed,
    skipped: 0,
    message: sent > 0 ? `Sent ${sent} text message${sent > 1 ? "s" : ""}` : "SMS failed for all recipients",
  };
}
