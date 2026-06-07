"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader, EmptyState, Input, Modal, Textarea } from "@/components/ui";

export interface PointOpportunity {
  id: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  active: boolean;
}

export function PointOpportunitiesPanel({
  orgId,
  opportunities,
  canManage,
  onChanged,
}: {
  orgId: string;
  opportunities: PointOpportunity[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", points: "2", category: "" });

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/point-opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: form.name,
        description: form.description,
        points: parseInt(form.points, 10),
        category: form.category,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not create");
      return;
    }
    toast.success("Opportunity created");
    setOpen(false);
    setForm({ name: "", description: "", points: "2", category: "" });
    onChanged();
  }

  async function toggleActive(opp: PointOpportunity) {
    const res = await fetch("/api/point-opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, id: opp.id, active: !opp.active }),
    });
    if (!res.ok) {
      toast.error("Could not update");
      return;
    }
    onChanged();
  }

  return (
    <Card>
      <CardHeader
        title="Point opportunities"
        icon={<Sparkles size={16} />}
        description="Ways members can earn credit beyond events"
        action={
          canManage ? (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
              New opportunity
            </Button>
          ) : undefined
        }
      />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="No custom opportunities yet"
          description={canManage ? "Create one for philanthropy hours, study sessions, and more." : "Check back when your officers add ways to earn points."}
        />
      ) : (
        <div className="space-y-2">
          {opportunities.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border">
              <div>
                <p className="font-medium text-foreground">{o.name}</p>
                {o.description && <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>}
                <div className="flex gap-2 mt-1">
                  <Badge label={`${o.points} pts`} color="green" />
                  {o.category && <Badge label={o.category} color="blue" />}
                  {!o.active && <Badge label="Paused" color="gray" />}
                </div>
              </div>
              {canManage && (
                <Button variant="secondary" size="sm" onClick={() => toggleActive(o)}>
                  {o.active ? "Pause" : "Resume"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New point opportunity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} loading={saving} disabled={!form.name.trim()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Philanthropy shift" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What counts for credit?" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Points" type="number" min={1} max={100} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
            <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Philanthropy" />
          </div>
        </div>
      </Modal>
    </Card>
  );
}
