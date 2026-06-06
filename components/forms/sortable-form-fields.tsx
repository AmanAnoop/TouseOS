"use client";

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
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface FormFieldItem {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "signature" | "number";
  required: boolean;
  options?: string[];
  placeholder?: string;
  page?: number;
  showWhen?: { fieldId: string; equals: string | boolean };
}

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "signature", label: "Signature" },
  { value: "number", label: "Number" },
];

function SortableFieldRow({
  field,
  index,
  allFields,
  onUpdate,
  onRemove,
}: {
  field: FormFieldItem;
  index: number;
  allFields: FormFieldItem[];
  onUpdate: (id: string, updates: Partial<FormFieldItem>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`p-4 rounded-lg border border-border bg-surface-1 ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
        <span className="text-xs text-muted-foreground mt-2 w-5 flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0 space-y-3">
          <Input
            label="Question label"
            placeholder="What should members see and answer?"
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Field type</label>
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={field.type}
                onChange={(e) => onUpdate(field.id, { type: e.target.value as FormFieldItem["type"] })}
              >
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-6 sm:mt-8">
              <input type="checkbox" className="rounded" checked={field.required} onChange={(e) => onUpdate(field.id, { required: e.target.checked })} />
              <span className="text-sm">Required</span>
            </label>
          </div>
          {field.type === "select" && (
            <Input
              label="Options (comma-separated)"
              placeholder="Option A, Option B, Option C"
              value={(field.options ?? []).join(", ")}
              onChange={(e) => onUpdate(field.id, {
                options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })}
            />
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Page"
              type="number"
              min={1}
              value={String(field.page ?? 1)}
              onChange={(e) => onUpdate(field.id, { page: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Visibility</label>
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={field.showWhen?.fieldId ?? ""}
                onChange={(e) => {
                  const fieldId = e.target.value;
                  if (!fieldId) onUpdate(field.id, { showWhen: undefined });
                  else onUpdate(field.id, { showWhen: { fieldId, equals: true } });
                }}
              >
                <option value="">Always visible</option>
                {allFields.filter((f) => f.id !== field.id).map((f) => (
                  <option key={f.id} value={f.id}>Show when &quot;{f.label || "field"}&quot; is checked</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => onRemove(field.id)} className="mt-2 text-muted-foreground hover:text-red-500 flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function SortableFormFields({
  fields,
  onChange,
  onAdd,
}: {
  fields: FormFieldItem[];
  onChange: (fields: FormFieldItem[]) => void;
  onAdd: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(fields, oldIndex, newIndex));
  }

  function updateField(id: string, updates: Partial<FormFieldItem>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Form fields</p>
        <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={onAdd}>Add field</Button>
      </div>
      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No fields yet. Add your first field.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  allFields={fields}
                  onUpdate={updateField}
                  onRemove={removeField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
