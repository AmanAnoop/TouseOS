"use client";

import {
  CheckCircle2, Circle, Clock, MoreHorizontal, User,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types";

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-gray-400",
};

export const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle size={16} className="text-muted-foreground" />,
  in_progress: <Clock size={16} className="text-blue-500" />,
  done: <CheckCircle2 size={16} className="text-green-500" />,
  cancelled: <Circle size={16} className="text-muted-foreground opacity-40" />,
};

interface TaskCardProps {
  task: Task & { assignees?: Array<{ assignee_name?: string | null }> };
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onSelect?: (task: Task) => void;
}

export function TaskCard({ task, onStatusChange, onEdit, onSelect }: TaskCardProps) {
  const assigneeCount = task.assignees?.length ?? 0;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div
      className="bg-card border border-border rounded-xl p-3 shadow-card hover:shadow-card-md transition-shadow group cursor-pointer"
      onClick={() => onSelect?.(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(
                task.id,
                task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done",
              );
            }}
            className="flex-shrink-0 mt-0.5"
          >
            {STATUS_ICON[task.status]}
          </button>
          <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground flex-shrink-0"
        >
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
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <User size={10} />
              {task.assignee_name.split(" ")[0]}
              {assigneeCount > 1 && <span>+{assigneeCount - 1}</span>}
            </span>
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
