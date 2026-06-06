"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, EmptyState, Modal, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { MemberProfile } from "@/types";

interface PhotoRequest {
  id: string;
  description: string;
  category: string;
  requester_name: string | null;
  album_id: string | null;
  target_member_ids: string[];
  fulfillments: number;
  created_at: string;
}

interface PhotoAlbum {
  id: string;
  title: string;
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
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "mixer", albumId: "", targetMemberIds: [] as string[] });

  const load = useCallback(async () => {
    setLoading(true);
    const [reqRes, albumRes, memberRes] = await Promise.all([
      fetch(`/api/photo-requests?org_id=${orgId}`),
      fetch(`/api/photo-albums?org_id=${encodeURIComponent(orgId)}`),
      fetch(`/api/members?org_id=${encodeURIComponent(orgId)}&scope=roster`),
    ]);
    if (reqRes.ok) setRequests(await reqRes.json());
    if (albumRes.ok) setAlbums(await albumRes.json());
    if (memberRes.ok) setMembers(await memberRes.json());
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const albumTitleById = new Map(albums.map((a) => [a.id, a.title]));
  const memberNameById = new Map(members.map((m) => [m.id, m.full_name]));

  function toggleMember(id: string) {
    setForm((prev) => ({
      ...prev,
      targetMemberIds: prev.targetMemberIds.includes(id)
        ? prev.targetMemberIds.filter((x) => x !== id)
        : [...prev.targetMemberIds, id],
    }));
  }

  async function createRequest() {
    if (form.targetMemberIds.length === 0) {
      toast.error("Select at least one member to request photos from");
      return;
    }
    const res = await fetch("/api/photo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        description: form.description,
        category: form.category,
        albumId: form.albumId || undefined,
        targetMemberIds: form.targetMemberIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create request");
      return;
    }
    toast.success("Photo request sent");
    setOpen(false);
    setForm({ description: "", category: "mixer", albumId: "", targetMemberIds: [] });
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
          description="Ask specific members for photos after events."
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
                    By {r.requester_name ?? "Officer"}
                    {r.album_id && albumTitleById.has(r.album_id)
                      ? ` · Album: ${albumTitleById.get(r.album_id)}`
                      : ""}
                    {" · "}
                    Requested from{" "}
                    {(r.target_member_ids ?? []).length
                      ? (r.target_member_ids ?? []).map((id) => memberNameById.get(id) ?? "Member").join(", ")
                      : "chapter"}
                    {" · "}{r.fulfillments} upload{r.fulfillments !== 1 ? "s" : ""}
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
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createRequest} disabled={!form.description.trim() || form.targetMemberIds.length === 0}>
              Send request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
          <Select
            label="Target album (optional)"
            value={form.albumId}
            onChange={(e) => setForm({ ...form, albumId: e.target.value })}
            placeholder="No specific album"
            options={[
              { value: "", label: "No specific album" },
              ...albums.map((a) => ({ value: a.id, label: a.title })),
            ]}
          />
          <div>
            <p className="text-sm font-medium mb-2">Request from *</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No roster members loaded</p>
              ) : members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-1">
                  <input
                    type="checkbox"
                    checked={form.targetMemberIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                  />
                  {m.full_name}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{form.targetMemberIds.length} selected</p>
          </div>
          <Textarea
            label="What do you need?"
            placeholder="Need candid photos from Saturday's mixer for Instagram..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="min-h-[100px]"
          />
        </div>
      </Modal>
    </div>
  );
}
