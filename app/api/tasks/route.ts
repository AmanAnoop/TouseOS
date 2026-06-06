import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { resolveAssignees, syncTaskAssignees } from "@/lib/task-assignee";
import { notifyTaskAssigneesViaSms } from "@/lib/task-sms";
import { insertTaskRow, updateTaskRow } from "@/lib/tasks-db";

async function awardTaskPointReward(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opts: {
    orgId: string;
    taskId: string;
    taskTitle: string;
    reward: number;
    recipientMode: string;
    actorUserId: string;
  },
) {
  const memberIds: string[] = [];
  if (opts.recipientMode === "assignees") {
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("member_id")
      .eq("task_id", opts.taskId);
    for (const row of assignees ?? []) {
      if (row.member_id) memberIds.push(String(row.member_id));
    }
  } else {
    const { data: member } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", opts.orgId)
      .eq("user_id", opts.actorUserId)
      .maybeSingle();
    if (member?.id) memberIds.push(String(member.id));
  }

  for (const memberId of [...new Set(memberIds)]) {
    await supabase.from("member_point_entries").insert({
      org_id: opts.orgId,
      member_id: memberId,
      points: opts.reward,
      reason: `Completed task: ${opts.taskTitle}`,
      entry_type: "earned",
      created_by: opts.actorUserId,
    });
  }
}

function normalizeAssigneeNames(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.assigneeNames)) {
    return body.assigneeNames.map((n) => String(n).trim()).filter(Boolean);
  }
  if (body.assigneeName) {
    return [String(body.assigneeName).trim()].filter(Boolean);
  }
  return [];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("org_id", orgId)
    .neq("status", "cancelled")
    .order("priority")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const taskIds = (data ?? []).map((t) => t.id);
  const assigneeMap: Record<string, Array<{ user_id: string; assignee_name: string | null; member_id: string | null }>> = {};

  if (taskIds.length > 0) {
    const { data: assignees } = await supabase
      .from("task_assignees")
      .select("task_id, user_id, assignee_name, member_id")
      .in("task_id", taskIds);
    for (const row of assignees ?? []) {
      const tid = String(row.task_id);
      if (!assigneeMap[tid]) assigneeMap[tid] = [];
      assigneeMap[tid].push(row as { user_id: string; assignee_name: string | null; member_id: string | null });
    }
  }

  const enriched = (data ?? []).map((t) => ({
    ...t,
    assignees: assigneeMap[t.id] ?? [],
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    title,
    description,
    priority,
    dueDate,
    tags,
    isRecurring,
    assigneeMemberIds,
    notifyViaSms,
    pointReward,
    pointRewardRecipient,
    pointRewardOpen,
    customRewardText,
  } = body;
  if (!orgId || !title?.trim()) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }

  let assigneeNames = normalizeAssigneeNames(body);
  const memberIds: string[] = Array.isArray(assigneeMemberIds)
    ? assigneeMemberIds.map(String)
    : [];

  if (memberIds.length > 0) {
    const { data: mems } = await supabase
      .from("member_profiles")
      .select("id, full_name, user_id")
      .eq("org_id", orgId)
      .in("id", memberIds);
    assigneeNames = (mems ?? []).map((m) => String(m.full_name));
  }

  const resolved = await resolveAssignees(supabase, orgId, assigneeNames);
  const primary = resolved[0];

  const insertPayload: Record<string, unknown> = {
    org_id: orgId,
    created_by: user.id,
    title: title.trim(),
    description: description || null,
    priority: priority ?? "medium",
    due_date: dueDate || null,
    assignee_name: primary
      ? (resolved.length > 1 ? `${primary.assigneeName} +${resolved.length - 1} more` : primary.assigneeName)
      : null,
    assigned_to: primary?.userId ?? null,
    status: "todo",
    tags: tags ?? [],
  };

  if (isRecurring !== undefined) {
    insertPayload.is_recurring = Boolean(isRecurring);
  }
  if (pointReward !== undefined) {
    insertPayload.point_reward = Math.max(0, Number(pointReward) || 0);
  }
  if (pointRewardRecipient === "assignees" || pointRewardRecipient === "completer") {
    insertPayload.point_reward_recipient = pointRewardRecipient;
  }
  if (pointRewardOpen !== undefined) {
    insertPayload.point_reward_open = Boolean(pointRewardOpen);
  }
  if (customRewardText !== undefined) {
    insertPayload.custom_reward_text = customRewardText ? String(customRewardText).trim() : null;
  }

  const { data, error } = await insertTaskRow(supabase, insertPayload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (resolved.length) {
    await syncTaskAssignees(supabase, data.id, resolved);
    const service = await createServiceClient();
    for (const assignee of resolved) {
      if (!assignee.userId) continue;
      await createNotification(service, {
        userId: assignee.userId,
        orgId,
        type: "task_due",
        title: "New task assigned",
        body: data.title,
        link: "/tasks",
      });
    }
  }

  let sms: Awaited<ReturnType<typeof notifyTaskAssigneesViaSms>> | undefined;
  if (notifyViaSms && (resolved.length > 0 || memberIds.length > 0)) {
    sms = await notifyTaskAssigneesViaSms(supabase, {
      orgId,
      taskId: data.id,
      title: data.title,
      dueDate: data.due_date,
      priority: data.priority,
      actorId: user.id,
      memberIds: memberIds.length ? memberIds : resolved.map((r) => r.memberId).filter(Boolean) as string[],
      userIds: resolved.map((r) => r.userId).filter(Boolean) as string[],
    });
  }

  const { data: full } = await supabase.from("tasks").select("*").eq("id", data.id).single();
  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("task_id, user_id, assignee_name, member_id")
    .eq("task_id", data.id);

  return NextResponse.json({ ...full, assignees: assignees ?? [], sms }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    id,
    status,
    assignee_name: assigneeName,
    assigneeNames,
    assigneeMemberIds,
    org_id: orgIdFromBody,
    notifyViaSms,
    is_recurring: isRecurringSnake,
    isRecurring: isRecurringCamel,
    ...rest
  } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("tasks")
    .select("org_id, title, due_date, priority, status, point_reward, point_reward_recipient")
    .eq("id", id)
    .single();
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const orgId = orgIdFromBody ?? existing.org_id;
  const updates: Record<string, unknown> = { ...rest };
  if (rest.pointReward !== undefined) {
    updates.point_reward = Math.max(0, Number(rest.pointReward) || 0);
    delete updates.pointReward;
  }
  if (rest.pointRewardRecipient === "assignees" || rest.pointRewardRecipient === "completer") {
    updates.point_reward_recipient = rest.pointRewardRecipient;
    delete updates.pointRewardRecipient;
  }
  if (rest.pointRewardOpen !== undefined) {
    updates.point_reward_open = Boolean(rest.pointRewardOpen);
    delete updates.pointRewardOpen;
  }
  if (rest.customRewardText !== undefined) {
    updates.custom_reward_text = rest.customRewardText ? String(rest.customRewardText).trim() : null;
    delete updates.customRewardText;
  }
  if (status) {
    updates.status = status;
    if (status === "done") {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
    }
  }
  const recurring = isRecurringSnake ?? isRecurringCamel;
  if (recurring !== undefined) {
    updates.is_recurring = Boolean(recurring);
  }

  const namesToSync =
    assigneeNames !== undefined
      ? (assigneeNames as string[]).map((n) => String(n).trim()).filter(Boolean)
      : assigneeName !== undefined
        ? [String(assigneeName).trim()].filter(Boolean)
        : null;

  let resolvedMemberIds: string[] = [];

  if (Array.isArray(assigneeMemberIds)) {
    const { data: mems } = await supabase
      .from("member_profiles")
      .select("id, full_name, user_id")
      .eq("org_id", orgId)
      .in("id", assigneeMemberIds);
    resolvedMemberIds = (mems ?? []).map((m) => String(m.id));
    const resolved = await resolveAssignees(
      supabase,
      orgId,
      (mems ?? []).map((m) => String(m.full_name)),
    );
    await syncTaskAssignees(supabase, id, resolved);
  } else if (namesToSync !== null) {
    const resolved = await resolveAssignees(supabase, orgId, namesToSync);
    await syncTaskAssignees(supabase, id, resolved);
    resolvedMemberIds = resolved.map((r) => r.memberId).filter(Boolean) as string[];
    if (resolved.length) {
      updates.assignee_name = resolved.length > 1
        ? `${resolved[0].assigneeName} +${resolved.length - 1} more`
        : resolved[0].assigneeName;
      updates.assigned_to = resolved[0].userId;
    } else {
      updates.assignee_name = null;
      updates.assigned_to = null;
    }
  }

  const { data, error } = await updateTaskRow(supabase, id, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reward = Number(updates.point_reward ?? existing.point_reward ?? 0);
  const recipientMode = String(
    updates.point_reward_recipient ?? existing.point_reward_recipient ?? "completer",
  );
  if (status === "done" && existing.status !== "done" && reward > 0) {
    await awardTaskPointReward(supabase, {
      orgId,
      taskId: id,
      taskTitle: String(existing.title),
      reward,
      recipientMode,
      actorUserId: user.id,
    });
  }

  let sms: Awaited<ReturnType<typeof notifyTaskAssigneesViaSms>> | undefined;
  if (notifyViaSms) {
    sms = await notifyTaskAssigneesViaSms(supabase, {
      orgId,
      taskId: id,
      title: String(updates.title ?? existing.title),
      dueDate: (updates.due_date as string | null | undefined) ?? existing.due_date,
      priority: String(updates.priority ?? existing.priority),
      actorId: user.id,
      memberIds: resolvedMemberIds.length ? resolvedMemberIds : undefined,
    });
  }

  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("task_id, user_id, assignee_name, member_id")
    .eq("task_id", id);

  return NextResponse.json({ ...data, assignees: assignees ?? [], sms });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
