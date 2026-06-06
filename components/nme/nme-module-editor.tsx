"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input, Modal, Textarea } from "@/components/ui";

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  is_required: boolean;
  order_index: number;
}

export function NmeModuleEditor({
  orgId,
  modules,
  onSaved,
}: {
  orgId: string;
  modules: ModuleRow[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    isRequired: true,
    orderIndex: 0,
  });

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      content: "",
      isRequired: true,
      orderIndex: modules.length,
    });
    setOpen(true);
  }

  function openEdit(mod: ModuleRow) {
    setEditing(mod);
    setForm({
      title: mod.title,
      description: mod.description ?? "",
      content: mod.content ?? "",
      isRequired: mod.is_required,
      orderIndex: mod.order_index,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    const payload = {
      orgId,
      title: form.title.trim(),
      description: form.description || null,
      content: form.content || null,
      isRequired: form.isRequired,
      orderIndex: form.orderIndex,
      ...(editing ? { id: editing.id } : {}),
    };
    const res = await fetch("/api/nme/modules", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success(editing ? "Module updated" : "Module created");
    setOpen(false);
    onSaved();
  }

  async function remove(id: string) {
    if (!confirm("Delete this module? Member progress will be lost.")) return;
    const res = await fetch(`/api/nme/modules?id=${encodeURIComponent(id)}&org_id=${encodeURIComponent(orgId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Module deleted");
    onSaved();
  }

  return (
    <Card>
      <CardHeader
        title="Curriculum editor"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Add module</Button>}
      />
      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No modules yet. Seed defaults or add your own.</p>
      ) : (
        <div className="space-y-2">
          {modules.map((mod) => (
            <div key={mod.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{mod.title}</p>
                <p className="text-xs text-muted-foreground">
                  {mod.is_required ? "Required" : "Optional"} · Order {mod.order_index}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openEdit(mod)}>Edit</Button>
              <button type="button" onClick={() => remove(mod.id)} className="text-muted-foreground hover:text-red-500 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit module" : "New module"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim()}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Order" type="number" value={String(form.orderIndex)} onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value, 10) || 0 })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <Textarea label="Content (markdown)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
            Required for all new members
          </label>
        </div>
      </Modal>
    </Card>
  );
}
