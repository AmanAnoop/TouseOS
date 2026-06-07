"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge, Button } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarPost {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  post_type: string;
}

function DraggablePostChip({ post }: { post: CalendarPost }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`text-[10px] px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 truncate cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      title={post.title}
    >
      {post.title}
    </div>
  );
}

function DayCell({
  dateStr,
  posts,
  isCurrentMonth,
  onDayClick,
}: {
  dateStr: string;
  posts: CalendarPost[];
  isCurrentMonth: boolean;
  onDayClick?: (dateStr: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const dayNum = parseInt(dateStr.slice(8), 10);

  return (
    <div
      ref={setNodeRef}
      role={onDayClick ? "button" : undefined}
      tabIndex={onDayClick ? 0 : undefined}
      onClick={() => onDayClick?.(dateStr)}
      onKeyDown={(e) => { if (onDayClick && (e.key === "Enter" || e.key === " ")) onDayClick(dateStr); }}
      className={`min-h-[72px] border border-border p-1 ${isCurrentMonth ? "bg-card" : "bg-surface-1/50"} ${isOver ? "ring-2 ring-pink-400" : ""} ${onDayClick ? "cursor-pointer hover:bg-surface-1" : ""}`}
    >
      <span className={`text-xs font-medium ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>{dayNum}</span>
      <div className="space-y-0.5 mt-0.5">
        {posts.map((p) => (
          <DraggablePostChip key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

export function SocialCalendarGrid({
  posts,
  onReschedule,
  onDayClick,
}: {
  posts: CalendarPost[];
  onReschedule: (postId: string, newDate: string) => void;
  onDayClick?: (dateStr: string) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { monthLabel, weeks, postByDate } = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ dateStr: string; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + i + 1);
      cells.push({ dateStr: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ dateStr, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].dateStr);
      last.setDate(last.getDate() + 1);
      cells.push({ dateStr: last.toISOString().slice(0, 10), inMonth: false });
    }

    const weeks: Array<Array<{ dateStr: string; inMonth: boolean }>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const postByDate = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      if (!p.scheduled_date) continue;
      const key = p.scheduled_date.slice(0, 10);
      if (!postByDate.has(key)) postByDate.set(key, []);
      postByDate.get(key)!.push(p);
    }

    return {
      monthLabel: firstDay.toLocaleString("default", { month: "long", year: "numeric" }),
      weeks,
      postByDate,
    };
  }, [monthOffset, posts]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newDate = String(over.id);
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      onReschedule(String(active.id), newDate);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => setMonthOffset((m) => m - 1)} icon={<ChevronLeft size={14} />} />
          <Button size="sm" variant="secondary" onClick={() => setMonthOffset(0)}>Today</Button>
          <Button size="sm" variant="secondary" onClick={() => setMonthOffset((m) => m + 1)} icon={<ChevronRight size={14} />} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Tap a day to schedule a post, or drag existing posts to reschedule.</p>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-0 border border-border rounded-xl overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase py-2 bg-surface-1 text-muted-foreground border-b border-border">{d}</div>
          ))}
          {weeks.flat().map((cell) => (
            <DayCell
              key={cell.dateStr}
              dateStr={cell.dateStr}
              posts={postByDate.get(cell.dateStr) ?? []}
              isCurrentMonth={cell.inMonth}
              onDayClick={onDayClick}
            />
          ))}
        </div>
      </DndContext>
      <div className="flex flex-wrap gap-2">
        <Badge label="Draft" color="gray" />
        <Badge label="Scheduled" color="blue" />
        <span className="text-xs text-muted-foreground">Posts with dates appear on the grid</span>
      </div>
    </div>
  );
}
