"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, EmptyState, Modal, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface PhotoRequest {
  id: string;
  description: string;
  category: string;
  requester_name: string | null;
  fulfillments: number;
  created_at: string;
}

const CATEGORIES = [
  { value: "mixer", label: "Mixer / social" },
  { value: "philanthropy", label: "Philanthropy" },
  { value: "recruitment", label: "Recruitment" },
  { value: "formal", label: "Formal / semi-formal" },
  { value: "brotherhood", label: "Brotherhood / sisterhood" },
  { value: "other", label: "Other" },
];

export function PhotoRequestsPanel({ orgId }: { orgId: string }) {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "mixer" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/photo-requests?org_id=${orgId}`);
    const data = await res.json();
    if (res.ok) setRequests(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRequest() {
    const res = await fetch("/api/photo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, description: form.description, category: form.category }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create request");
      return;
    }
    toast.success("Photo request sent to chapter");
    setOpen(false);
    setForm({ description: "", category: "mixer" });
    load();
  }

  async function bumpFulfillment(id: string, current: number) {
    const res = await fetch("/api/photo-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, fulfillments: current + 1 }),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>
          Request photos
        </Button>
      </div>

      {loading ? (
        <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Camera size={24} />}
          title="No photo requests"
          description="Social chairs can ask members for specific shots after events."
          action={<Button size="sm" onClick={() => setOpen(true)}>Create request</Button>}
        />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={r.category} color="blue" />
                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    By {r.requester_name ?? "Officer"} · {r.fulfillments} upload{r.fulfillments !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => bumpFulfillment(r.id, r.fulfillments)}>
                  +1 photo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request photos from members"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createRequest} disabled={!form.description.trim()}>Post request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
          <Textarea
            label="What do you need?"
            placeholder="Need 10+ candid photos from Saturday's mixer for Instagram carousel..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="min-h-[100px]"
          />
        </div>
      </Modal>
    </div>
  );
}
