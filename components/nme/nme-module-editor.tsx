"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input, Modal, Textarea } from "@/components/ui";
import type { QuizQuestion } from "@/components/nme/nme-module-modal";

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  is_required: boolean;
  order_index: number;
  quiz_questions?: QuizQuestion[];
}

const emptyQuestion = (): QuizQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

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
    quizQuestions: [] as QuizQuestion[],
  });

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      content: "",
      isRequired: true,
      orderIndex: modules.length,
      quizQuestions: [],
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
      quizQuestions: (mod.quiz_questions ?? []).map((q) => ({
        question: q.question,
        options: [...q.options],
        correctIndex: q.correctIndex,
      })),
    });
    setOpen(true);
  }

  function updateQuestion(idx: number, patch: Partial<QuizQuestion>) {
    setForm((f) => ({
      ...f,
      quizQuestions: f.quizQuestions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setForm((f) => ({
      ...f,
      quizQuestions: f.quizQuestions.map((q, i) => {
        if (i !== qIdx) return q;
        const options = [...q.options];
        options[oIdx] = value;
        return { ...q, options };
      }),
    }));
  }

  async function save() {
    if (!form.title.trim()) return;
    const quizQuestions = form.quizQuestions
      .filter((q) => q.question.trim() && q.options.some((o) => o.trim()))
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: Math.min(q.correctIndex, q.options.filter((o) => o.trim()).length - 1),
      }));

    const payload = {
      orgId,
      title: form.title.trim(),
      description: form.description || null,
      content: form.content || null,
      isRequired: form.isRequired,
      orderIndex: form.orderIndex,
      quizQuestions,
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
                  {(mod.quiz_questions?.length ?? 0) > 0 ? ` · ${mod.quiz_questions!.length} quiz Q` : ""}
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
        size="lg"
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

          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Quiz questions</p>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() => setForm({ ...form, quizQuestions: [...form.quizQuestions, emptyQuestion()] })}
              >
                Add question
              </Button>
            </div>
            {form.quizQuestions.map((q, qi) => (
              <div key={qi} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex gap-2">
                  <Input
                    label={`Question ${qi + 1}`}
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                  />
                  <button
                    type="button"
                    className="self-end p-2 text-muted-foreground hover:text-red-500"
                    onClick={() => setForm({
                      ...form,
                      quizQuestions: form.quizQuestions.filter((_, i) => i !== qi),
                    })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQuestion(qi, { correctIndex: oi })}
                    />
                    <input
                      className="flex-1 h-9 rounded-lg border border-border px-3 text-sm"
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Card>
  );
}
