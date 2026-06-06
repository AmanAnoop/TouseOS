"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { TaskCard, STATUS_ICON } from "@/components/tasks/task-card";
import { Skeleton } from "@/components/ui";

function DraggableTask({
  task,
  onStatusChange,
  onEdit,
  onSelect,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onSelect: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <TaskCard task={task} onStatusChange={onStatusChange} onEdit={onEdit} onSelect={onSelect} />
    </div>
  );
}

function KanbanColumn({
  id,
  label,
  tasks,
  loading,
  onStatusChange,
  onEdit,
  onSelect,
  onAdd,
}: {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  loading: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onSelect: (task: Task) => void;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {STATUS_ICON[id]}
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs bg-surface-2 rounded-full px-2 py-0.5 text-muted-foreground">{tasks.length}</span>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="text-muted-foreground hover:text-foreground">
            <Plus size={16} />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[120px] rounded-xl p-1 transition-colors ${isOver ? "bg-greek-50/50 dark:bg-greek-950/20" : ""}`}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ds-card" style={{ padding: 14 }}>
              <Skeleton style={{ height: 14, width: "70%", marginBottom: 10 }} />
              <Skeleton style={{ height: 10, width: "45%" }} />
            </div>
          ))
          : tasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onSelect={onSelect}
            />
          ))}
        {!loading && tasks.length === 0 && id !== "done" && (
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskKanbanBoard({
  columns,
  loading,
  onStatusChange,
  onEdit,
  onSelect,
  onAdd,
}: {
  columns: Array<{ id: TaskStatus; label: string; tasks: Task[] }>;
  loading: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onSelect: (task: Task) => void;
  onAdd: () => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const allTasks = columns.flatMap((c) => c.tasks);

  function handleDragStart(event: DragStartEvent) {
    const task = allTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const columnIds = columns.map((c) => c.id);
    const targetStatus = columnIds.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : allTasks.find((t) => t.id === overId)?.status;

    if (!targetStatus) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      onStatusChange(taskId, targetStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={col.tasks}
            loading={loading}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onSelect={onSelect}
            onAdd={col.id === "todo" ? onAdd : undefined}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onStatusChange={() => {}} onEdit={() => {}} onSelect={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
