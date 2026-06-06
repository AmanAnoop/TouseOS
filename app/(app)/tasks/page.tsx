"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle, CheckCircle2, Circle, Clock,
  MessageSquare, MoreHorizontal, Plus, User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { Badge, Button, Card, EmptyState, Input, Modal,
  PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { STATUS_ICON, PRIORITY_DOT } from "@/components/tasks/task-card";
import { TASK_TYPES, taskTypeFromTags, taskTypeLabel, tagsWithType, type TaskTypeValue } from "@/lib/task-config";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";

export default function TasksPage() {
  const { orgId, userId, loading: orgLoading } = useOrg();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [userName, setUserName] = useState("");
  const [memberOptions, setMemberOptions] = useState<Array<{ id: string; name: string }>>([]);

  const [form, setForm] = useState({
    taskType: "administrative" as TaskTypeValue,
    title: "", description: "", priority: "medium" as TaskPriority, isRecurring: false,
    dueDate: "", assigneeName: "", tags: "", pointReward: "0",
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [notifyViaSms, setNotifyViaSms] = useState(false);
  const [twilioLive, setTwilioLive] = useState<boolean | null>(null);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/tasks?org_id=${encodeURIComponent(oid)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to load tasks");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/account?org_id=${encodeURIComponent(orgId ?? "")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const name = data?.profile?.fullName;
        if (name) {
          setUserName(String(name));
          setForm((f) => ({ ...f, assigneeName: String(name) }));
        }
      });
  }, [userId, orgId]);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const twilio = data?.integrations?.find((i: { id: string }) => i.id === "twilio");
        setTwilioLive(Boolean(twilio?.live));
      })
      .catch(() => setTwilioLive(false));
  }, []);

  useEffect(() => {
    if (!orgId) return;
    load(orgId);
    fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const opts = (data as Array<{ id: string; full_name: string; preferred_name?: string | null }>).map((m) => ({
          id: m.id,
          name: m.preferred_name ? `${m.preferred_name} (${m.full_name})` : m.full_name,
        }));
        setMemberOptions(opts);
      });
  }, [orgId, load]);

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    const assignees = (t as Task & { assignees?: Array<{ user_id: string }> }).assignees ?? [];
    return (
      t.assigned_to === userId
      || t.created_by === userId
      || assignees.some((a) => a.user_id === userId)
    );
  });

  const byStatus = {
    todo: filtered.filter((t) => t.status === "todo"),
    in_progress: filtered.filter((t) => t.status === "in_progress"),
    done: filtered.filter((t) => t.status === "done"),
  };

  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date());

  async function saveTask() {
    if (!orgId || !form.title) return;
    const extraTags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const tags = tagsWithType(extraTags, form.taskType);

    if (editTask) {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTask.id,
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          due_date: form.dueDate || null,
          assigneeMemberIds: selectedMemberIds,
          status: editTask.status,
          tags,
          is_recurring: form.isRecurring,
          pointReward: parseInt(form.pointReward, 10) || 0,
          notifyViaSms: notifyViaSms && selectedMemberIds.length > 0,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; sms?: { message?: string; sent?: number } };
      if (!res.ok) { toast.error(data.error ?? "Update failed"); return; }
      toast.success("Task updated");
      if (data.sms?.sent) toast.success(data.sms.message ?? "Assignees notified by text");
      else if (notifyViaSms && data.sms?.message) toast.error(data.sms.message);
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          title: form.title,
          description: form.description,
          priority: form.priority,
          dueDate: form.dueDate,
          assigneeMemberIds: selectedMemberIds,
          tags,
          isRecurring: form.isRecurring,
          pointReward: parseInt(form.pointReward, 10) || 0,
          notifyViaSms: notifyViaSms && selectedMemberIds.length > 0,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; sms?: { message?: string; sent?: number } };
      if (!res.ok) { toast.error(data.error ?? "Create failed"); return; }
      toast.success("Task created");
      if (data.sms?.sent) toast.success(data.sms.message ?? "Assignees notified by text");
      else if (notifyViaSms && data.sms?.message) toast.error(data.sms.message);
    }

    setCreateOpen(false);
    setEditTask(null);
    setForm({ taskType: "administrative", title: "", description: "", priority: "medium", isRecurring: false, dueDate: "", assigneeName: "", tags: "", pointReward: "0" });
    setSelectedMemberIds([]);
    setNotifyViaSms(false);
    load(orgId);
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this completed task?")) return;
    const res = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete task");
      return;
    }
    toast.success("Task deleted");
    setDetailTask(null);
    if (orgId) load(orgId);
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Update failed"); return; }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } as Task : t)));
    if (status === "done") toast.success("Task completed");
  }

  function openEdit(task: Task) {
    setEditTask(task);
    const assignees = (task as Task & { assignees?: Array<{ member_id: string | null }> }).assignees ?? [];
    setForm({
      taskType: taskTypeFromTags(task.tags),
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.due_date ?? "",
      isRecurring: Boolean((task as { is_recurring?: boolean }).is_recurring),
      assigneeName: task.assignee_name ?? "",
      tags: (task.tags ?? []).filter((t) => !t.startsWith("type:")).join(", "),
      pointReward: String((task as Task & { point_reward?: number }).point_reward ?? 0),
    });
    setSelectedMemberIds(
      assignees.map((a) => a.member_id).filter((id): id is string => Boolean(id)),
    );
    setCreateOpen(true);
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }

  function selectAllMembers() {
    setSelectedMemberIds(memberOptions.map((m) => m.id));
  }

  const columns = [
    { id: "todo" as TaskStatus, label: "To do", tasks: byStatus.todo },
    { id: "in_progress" as TaskStatus, label: "In progress", tasks: byStatus.in_progress },
    { id: "done" as TaskStatus, label: "Done", tasks: byStatus.done },
  ];

  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.filter((t) => t.status !== "cancelled").length;

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Tasks"
        description={`${total - done} open · ${done} completed`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setFilter((f) => f === "all" ? "mine" : "all")}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm border transition-colors ${filter === "mine" ? "bg-greek-50 border-greek-300 text-greek-700" : "border-border text-muted-foreground hover:bg-surface-1"}`}
            >
              <User size={14} />
              {filter === "mine" ? "My tasks" : "All tasks"}
            </button>
            <Button size="sm" className="officer-touch" icon={<Plus size={14} />} onClick={() => { setEditTask(null); setCreateOpen(true); }}>
              New task
            </Button>
          </div>
        }
      />

      {overdue.length > 0 && (
        <div className="ds-alert ds-alert-error flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span><strong>{overdue.length} task{overdue.length > 1 ? "s" : ""}</strong> overdue — {overdue.map((t) => t.title).join(", ")}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="To do" value={byStatus.todo.length} icon={<Circle size={16} />} />
        <StatCard title="In progress" value={byStatus.in_progress.length} icon={<Clock size={16} />} />
        <StatCard title="Done" value={done} deltaType="up" icon={<CheckCircle2 size={16} />} />
      </div>

      <Tabs
        tabs={[{ id: "board", label: "Board" }, { id: "list", label: "List" }]}
        active={tab}
        onChange={setTab}
      />

      {tab === "board" ? (
        <TaskKanbanBoard
          columns={columns}
          loading={loading || orgLoading}
          onStatusChange={updateStatus}
          onEdit={openEdit}
          onSelect={setDetailTask}
          onAdd={() => { setEditTask(null); setCreateOpen(true); }}
        />
      ) : (
        /* List view */
        <Card padding="none">
          {(loading || orgLoading) ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={24} />} title="No tasks" action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create task</Button>} />
          ) : (
            <div className="divide-y divide-border">
              {[...byStatus.in_progress, ...byStatus.todo, ...byStatus.done].map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 hover:bg-surface-1 transition-colors cursor-pointer" style={{ minHeight: 44 }} onClick={() => setDetailTask(task)}>
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(task.id, task.status === "done" ? "todo" : "done"); }}>
                    {STATUS_ICON[task.status]}
                  </button>
                  <Badge label={taskTypeLabel(taskTypeFromTags(task.tags))} color="gray" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.assignee_name && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User size={10} />{task.assignee_name}
                        </span>
                      )}
                      {task.tags?.map((tag) => (
                        <span key={tag} className="text-xs bg-surface-2 rounded-full px-2 text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.due_date && (
                      <span className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-500" : "text-muted-foreground"}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                    <button onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditTask(null); }}
        title={editTask ? "Edit task" : "New task"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setEditTask(null); }}>Cancel</Button>
            <Button onClick={saveTask} disabled={!form.title}>{editTask ? "Save" : "Create"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Type"
            value={form.taskType}
            onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskTypeValue })}
            options={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input label="Title" required placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select
            label="Assigned to"
            value={selectedMemberIds[0] ?? ""}
            onChange={(e) => setSelectedMemberIds(e.target.value ? [e.target.value] : [])}
            options={[
              { value: "", label: "Unassigned" },
              ...memberOptions.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Textarea label="Description" placeholder="Add details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              options={[
                { value: "urgent", label: "Urgent" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} />
            Recurring task
          </label>
          {twilioLive && selectedMemberIds.length > 0 && (
            <label className="flex items-start gap-2 text-sm p-3 rounded-lg bg-surface-1 border border-border">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={notifyViaSms}
                onChange={(e) => setNotifyViaSms(e.target.checked)}
              />
              <span>
                <span className="font-medium flex items-center gap-1">
                  <MessageSquare size={14} />
                  Text assignees (Twilio)
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Sends a task reminder to each assignee&apos;s phone on the roster. Quiet hours 9pm–9am apply.
                </span>
              </span>
            </label>
          )}
          {twilioLive === false && selectedMemberIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Add Twilio keys in Settings → Integrations to text assignees when creating tasks.
            </p>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Assign to members</p>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-greek-600 hover:underline" onClick={selectAllMembers}>Select all</button>
                <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setSelectedMemberIds([])}>Clear</button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {memberOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Load roster members first</p>
              ) : memberOptions.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-1">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{selectedMemberIds.length} selected</p>
            )}
          </div>
          <Input
            label="Point reward"
            type="number"
            min={0}
            hint="Anyone who completes this task earns these points"
            value={form.pointReward}
            onChange={(e) => setForm({ ...form, pointReward: e.target.value })}
          />
          <Input label="Tags (comma-separated)" placeholder="recruitment, social, important" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          {editTask && (
            <Select
              label="Status"
              value={editTask.status}
              onChange={(e) => setEditTask({ ...editTask, status: e.target.value as TaskStatus })}
              options={[
                { value: "todo", label: "To do" },
                { value: "in_progress", label: "In progress" },
                { value: "done", label: "Done" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          )}
        </div>
      </Modal>

      {detailTask && orgId && (
        <TaskDetailPanel
          task={detailTask}
          orgId={orgId}
          userId={userId}
          userName={userName}
          twilioLive={twilioLive}
          onClose={() => setDetailTask(null)}
          onUpdate={() => load(orgId)}
          onDelete={detailTask.status === "done" ? () => deleteTask(detailTask.id) : undefined}
        />
      )}
    </div>
  );
}

