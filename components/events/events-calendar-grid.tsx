"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import type { Event } from "@/types";

function eventDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function EventsCalendarGrid({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: Event[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { monthLabel, weeks, eventsByDate } = useMemo(() => {
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

    const eventsByDate = new Map<string, Event[]>();
    for (const e of events) {
      const key = eventDateKey(e.starts_at);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(e);
    }

    return {
      monthLabel: base.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      weeks,
      eventsByDate,
    };
  }, [events, monthOffset]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month" />
        <p className="font-display text-lg font-semibold text-foreground">{monthLabel}</p>
        <Button variant="ghost" size="sm" icon={<ChevronRight size={16} />} onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month" />
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border">
            {week.map(({ dateStr, inMonth }) => {
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === today;
              const dayNum = parseInt(dateStr.slice(8), 10);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  className={`min-h-[72px] p-1.5 text-left transition-colors ${
                    inMonth ? "bg-card" : "bg-surface-1/50"
                  } ${isSelected ? "ring-2 ring-inset ring-greek-500 bg-greek-50 dark:bg-greek-950/30" : "hover:bg-surface-1"}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? "bg-greek-600 text-white" : inMonth ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="text-[10px] px-1 py-0.5 rounded bg-greek-100 dark:bg-greek-950/50 text-greek-800 dark:text-greek-300 truncate"
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
