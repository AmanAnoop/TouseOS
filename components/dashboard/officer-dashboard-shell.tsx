"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  DASHBOARD_WIDGET_LABELS,
  DEFAULT_DASHBOARD_LAYOUT,
  visibleDashboardWidgets,
  type DashboardLayoutPrefs,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";

function SortableWidget({
  id,
  editing,
  onRemove,
  children,
}: {
  id: DashboardWidgetId;
  editing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? "opacity-70 z-10" : ""} ${editing ? "ring-1 ring-dashed ring-border rounded-xl p-1" : ""}`}
    >
      {editing && (
        <div className="flex items-center justify-between gap-2 px-2 py-1 mb-1">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={12} /> {DASHBOARD_WIDGET_LABELS[id]}
          </button>
          <button type="button" className="text-muted-foreground hover:text-red-500" onClick={onRemove} aria-label="Remove widget">
            <X size={14} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

interface OfficerDashboardShellProps {
  orgId: string;
  widgets: Partial<Record<DashboardWidgetId, React.ReactNode>>;
}

export function OfficerDashboardShell({ orgId, widgets }: OfficerDashboardShellProps) {
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayoutPrefs>({
    order: [...DEFAULT_DASHBOARD_LAYOUT],
    hidden: [],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/account/dashboard-layout?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) {
      const data = await res.json();
      setLayout(data.layout);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function save(next: DashboardLayoutPrefs) {
    setSaving(true);
    const res = await fetch("/api/account/dashboard-layout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, layout: next }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setLayout(data.layout);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.order.indexOf(active.id as DashboardWidgetId);
    const newIndex = layout.order.indexOf(over.id as DashboardWidgetId);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = { ...layout, order: arrayMove(layout.order, oldIndex, newIndex) };
    setLayout(next);
    void save(next);
  }

  function hideWidget(id: DashboardWidgetId) {
    const next = { ...layout, hidden: [...new Set([...layout.hidden, id])] };
    setLayout(next);
    void save(next);
  }

  function restoreWidget(id: DashboardWidgetId) {
    const next = { ...layout, hidden: layout.hidden.filter((h) => h !== id) };
    setLayout(next);
    void save(next);
  }

  const visible = visibleDashboardWidgets(layout);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={editing ? "primary" : "secondary"}
          icon={<LayoutGrid size={14} />}
          loading={saving}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done editing" : "Edit dashboard"}
        </Button>
      </div>

      {editing && layout.hidden.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-surface-1">
          <span className="text-xs text-muted-foreground w-full mb-1">Hidden widgets — click to restore</span>
          {layout.hidden.map((id) => (
            <Button key={id} size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => restoreWidget(id)}>
              {DASHBOARD_WIDGET_LABELS[id]}
            </Button>
          ))}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visible.map((id) => {
              const node = widgets[id];
              if (!node) return null;
              return (
                <SortableWidget key={id} id={id} editing={editing} onRemove={() => hideWidget(id)}>
                  {node}
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
