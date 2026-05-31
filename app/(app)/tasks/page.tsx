"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle, CheckCircle2, Circle, Clock,
  MoreHorizontal, Plus, User,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, EmptyState, Input, Modal,
  PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-400", low: "bg-gray-400",
};
const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle size={16} className="text-muted-foreground" />,
  in_progress: <Clock size={16} className="text-blue-500" />,
  done: <CheckCircle2 size={16} className="text-green-500" />,
  cancelled: <Circle size={16} className="text-muted-foreground opacity-40" />,
};

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as TaskPriority, isRecurring: false,
    dueDate: "", assigneeName: "", tags: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", oid)
      .neq("status", "cancelled")
      .order("priority")
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [mRes, pRes] = await Promise.all([
        supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);
      if (mRes.data) { setOrgId(mRes.data.org_id); load(mRes.data.org_id); }
      if (pRes.data) setForm((f) => ({ ...f, assigneeName: String(pRes.data.full_name) }));
    }
    init();
  }, [supabase, load]);

  const filtered = tasks.filter((t) => filter === "all" || t.assigned_to === userId);

  const byStatus = {
    todo: filtered.filter((t) => t.status === "todo"),
    in_progress: filtered.filter((t) => t.status === "in_progress"),
    done: filtered.filter((t) => t.status === "done"),
  };

  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date());

  async function saveTask() {
    if (!orgId || !form.title) return;
    const payload = {
      org_id: orgId,
      created_by: userId,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.dueDate || null,
      assignee_name: form.assigneeName || null,
      status: (editTask?.status ?? "todo") as TaskStatus,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    if (editTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editTask.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Task created");
    }

    setCreateOpen(false);
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", isRecurring: false, dueDate: "", assigneeName: "", tags: "" });
    load(orgId);
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const updates: Partial<Task> = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    await supabase.from("tasks").update(updates).eq("id", id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    if (status === "done") toast.success("Task completed ✓");
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.due_date ?? "",
      isRecurring: Boolean((task as { is_recurring?: boolean }).is_recurring),
      assigneeName: task.assignee_name ?? "",
      tags: task.tags?.join(", ") ?? "",
    });
    setCreateOpen(true);
  }

  const columns = [
    { id: "todo" as TaskStatus, label: "To do", tasks: byStatus.todo },
    { id: "in_progress" as TaskStatus, label: "In progress", tasks: byStatus.in_progress },
    { id: "done" as TaskStatus, label: "Done", tasks: byStatus.done },
  ];

  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.filter((t) => t.status !== "cancelled").length;

  return (
    <div className="space-y-5">
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
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditTask(null); setCreateOpen(true); }}>
              New task
            </Button>
          </div>
        }
      />

      {overdue.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
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
        /* Kanban board */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {STATUS_ICON[col.id]}
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <span className="text-xs bg-surface-2 rounded-full px-2 py-0.5 text-muted-foreground">{col.tasks.length}</span>
                </div>
                {col.id === "todo" && (
                  <button onClick={() => { setEditTask(null); setCreateOpen(true); }} className="text-muted-foreground hover:text-foreground">
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />)
                  : col.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateStatus}
                      onEdit={openEdit}
                    />
                  ))}
                {!loading && col.tasks.length === 0 && col.id !== "done" && (
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                    No {col.label.toLowerCase()} tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <Card padding="none">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={24} />} title="No tasks" action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create task</Button>} />
          ) : (
            <div className="divide-y divide-border">
              {[...byStatus.in_progress, ...byStatus.todo, ...byStatus.done].map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors">
                  <button onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")}>
                    {STATUS_ICON[task.status]}
                  </button>
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
                    <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-foreground">
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
          <Input label="Title" required placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" placeholder="Add details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              options={[
                { value: "urgent", label: "🔴 Urgent" },
                { value: "high", label: "🟠 High" },
                { value: "medium", label: "🟡 Medium" },
                { value: "low", label: "⚪ Low" },
              ]}
            />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} /> Recurring task</label>
          <Input label="Assignee" placeholder="Who's responsible?" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} />
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
    </div>
  );
}

function TaskCard({ task, onStatusChange, onEdit }: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-card hover:shadow-card-md transition-shadow group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={() => onStatusChange(task.id, task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done")}
            className="flex-shrink-0 mt-0.5"
          >
            {STATUS_ICON[task.status]}
          </button>
          <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
        </div>
        <button onClick={() => onEdit(task)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-1.5 ml-6 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2.5 ml-6">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          {task.assignee_name && (
            <span className="text-xs text-muted-foreground">{task.assignee_name.split(" ")[0]}</span>
          )}
          {task.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] bg-surface-2 rounded-full px-1.5 text-muted-foreground">{tag}</span>
          ))}
        </div>
        {task.due_date && (
          <span className={`text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
            {isOverdue ? "Overdue" : formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}
