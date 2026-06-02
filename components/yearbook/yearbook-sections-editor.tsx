"use client";

import { useState, useEffect, useCallback } from "react";
import { Award, GraduationCap, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Textarea } from "@/components/ui";

interface Section {
  id: string;
  section_type: string;
  title: string;
  body: string | null;
  person_name: string | null;
  image_url: string | null;
}

const SECTION_TYPES = [
  { value: "senior_spotlight", label: "Senior spotlight" },
  { value: "award", label: "Award / recognition" },
  { value: "alumni_message", label: "Alumni message" },
  { value: "exec_board", label: "Exec board recap" },
  { value: "philanthropy_highlight", label: "Philanthropy highlight" },
];

export function YearbookSectionsEditor({ orgId }: { orgId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sectionType: "senior_spotlight",
    title: "",
    body: "",
    personName: "",
    imageUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/yearbook/sections?org_id=${orgId}`);
    const data = await res.json();
    if (res.ok) setSections(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSection() {
    const res = await fetch("/api/yearbook/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        sectionType: form.sectionType,
        title: form.title,
        body: form.body,
        personName: form.personName,
        imageUrl: form.imageUrl,
        orderIndex: sections.length,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not add section");
      return;
    }
    toast.success("Section added");
    setOpen(false);
    setForm({ sectionType: "senior_spotlight", title: "", body: "", personName: "", imageUrl: "" });
    load();
  }

  async function remove(id: string) {
    const res = await fetch("/api/yearbook/sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId }),
    });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    load();
  }

  const iconFor = (type: string) => {
    if (type === "senior_spotlight") return <GraduationCap size={14} />;
    if (type === "award") return <Award size={14} />;
    return <Users size={14} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custom yearbook pages</h2>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
          Add section
        </Button>
      </div>

      {loading ? (
        <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={24} />}
          title="No custom sections"
          description="Add senior spotlights, awards, exec board notes, and alumni messages for your export."
          action={<Button size="sm" onClick={() => setOpen(true)}>Add section</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {sections.map((s) => (
            <Card key={s.id} padding="sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {iconFor(s.section_type)}
                    <Badge label={s.section_type.replace(/_/g, " ")} color="gray" />
                  </div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  {s.person_name && <p className="text-xs text-muted-foreground">{s.person_name}</p>}
                  {s.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.body}</p>}
                </div>
                <Button size="sm" variant="secondary" icon={<Trash2 size={12} />} onClick={() => remove(s.id)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add yearbook section"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addSection} disabled={!form.title.trim()}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Type" value={form.sectionType} onChange={(e) => setForm({ ...form, sectionType: e.target.value })} options={SECTION_TYPES} />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Person / award recipient" value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} />
          <Textarea label="Content" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-[100px]" />
          <Input label="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
