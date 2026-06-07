"use client";

import { useRef, useState } from "react";
import { Camera, Check, Clock, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, Modal, Textarea,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { PointOpportunity } from "./point-opportunities-panel";

interface PointRequest {
  id: string;
  member_id: string;
  points_requested: number;
  category: string | null;
  reason: string;
  status: string;
  denial_reason: string | null;
  proof_url: string | null;
  created_at: string;
  member_profiles?: { full_name: string; profile_photo_url: string | null } | null;
  point_opportunities?: { name: string } | null;
}

export function PointRequestsPanel({
  orgId,
  requests,
  opportunities,
  canManage,
  onChanged,
}: {
  orgId: string;
  requests: PointRequest[];
  opportunities: PointOpportunity[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState<PointRequest | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ opportunityId: "", reason: "", category: "", points: "2" });
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pending = requests.filter((r) => r.status === "pending");
  const mine = requests.filter((r) => r.status !== "pending" || !canManage);

  async function uploadProof(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("org_id", orgId);
    const res = await fetch("/api/point-requests/upload-proof", { method: "POST", body });
    setUploading(false);
    if (!res.ok) {
      toast.error("Could not upload photo");
      return;
    }
    const { storagePath } = await res.json();
    setProofPath(storagePath);
    toast.success("Photo attached");
  }

  async function submitRequest() {
    if (!form.reason.trim()) return;
    setSaving(true);
    const opp = opportunities.find((o) => o.id === form.opportunityId);
    const res = await fetch("/api/point-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        opportunityId: form.opportunityId || null,
        pointsRequested: opp?.points ?? parseInt(form.points, 10),
        category: opp?.category ?? form.category,
        reason: form.reason,
        proofStoragePath: proofPath,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not submit");
      return;
    }
    toast.success("Request submitted — you'll hear back soon");
    setSubmitOpen(false);
    setForm({ opportunityId: "", reason: "", category: "", points: "2" });
    setProofPath(null);
    onChanged();
  }

  async function review(id: string, action: "approve" | "deny", denialReason?: string) {
    setSaving(true);
    const res = await fetch(`/api/point-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action, denialReason }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not update");
      return;
    }
    toast.success(action === "approve" ? "Approved" : "Denied");
    setDenyOpen(null);
    setDenyReason("");
    onChanged();
  }

  function RequestRow({ r, showActions }: { r: PointRequest; showActions?: boolean }) {
    const name = r.member_profiles?.full_name ?? "Member";
    return (
      <div className="p-3 rounded-xl border border-border space-y-2">
        <div className="flex items-start gap-3">
          <Avatar name={name} src={r.member_profiles?.profile_photo_url} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-sm">{name}</p>
              <Badge
                label={r.status === "pending" ? "Waiting" : r.status === "approved" ? "Approved" : "Denied"}
                color={r.status === "approved" ? "green" : r.status === "denied" ? "red" : "yellow"}
              />
              <Badge label={`${r.points_requested} pts`} color="blue" />
              {r.category && <Badge label={r.category} color="purple" />}
            </div>
            <p className="text-sm text-foreground mt-1">{r.reason}</p>
            {r.point_opportunities?.name && (
              <p className="text-xs text-muted-foreground">For: {r.point_opportunities.name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(r.created_at)}</p>
            {r.status === "denied" && r.denial_reason && (
              <p className="text-sm text-red-600 mt-2">Officer note: {r.denial_reason}</p>
            )}
          </div>
          {r.proof_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={r.proof_url} alt="Proof" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
        </div>
        {showActions && r.status === "pending" && (
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" icon={<X size={14} />} onClick={() => setDenyOpen(r)}>
              Deny
            </Button>
            <Button size="sm" icon={<Check size={14} />} loading={saving} onClick={() => review(r.id, "approve")}>
              Approve
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        title={canManage ? "Point requests" : "My requests"}
        icon={<Clock size={16} />}
        description={canManage ? "Review proof submissions from members" : "Submit proof to earn points"}
        action={
          !canManage ? (
            <Button size="sm" onClick={() => setSubmitOpen(true)}>Request points</Button>
          ) : undefined
        }
      />

      {canManage && pending.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{pending.length} waiting</p>
          {pending.map((r) => (
            <RequestRow key={r.id} r={r} showActions />
          ))}
        </div>
      )}

      {(canManage ? requests.filter((r) => r.status !== "pending") : mine).length === 0 ? (
        <EmptyState
          icon={<Clock size={20} />}
          title={canManage ? "No reviewed requests yet" : "No requests yet"}
          description={canManage ? "Pending submissions appear above." : "Tap Request points when you've done something that counts."}
          action={!canManage ? <Button size="sm" onClick={() => setSubmitOpen(true)}>Request points</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {(canManage ? requests.filter((r) => r.status !== "pending") : mine).map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </div>
      )}

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Request points"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} loading={saving} disabled={!form.reason.trim()}>Submit</Button>
          </>
        }
      >
        <div className="space-y-3">
          {opportunities.length > 0 && (
            <select
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              value={form.opportunityId}
              onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}
            >
              <option value="">Custom request</option>
              {opportunities.filter((o) => o.active).map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.points} pts)</option>
              ))}
            </select>
          )}
          {!form.opportunityId && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Points requested" type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
              <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Philanthropy" />
            </div>
          )}
          <Textarea
            label="What did you do?"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Describe what you did and why it should count..."
            className="min-h-[100px]"
          />
          <div>
            <p className="text-sm font-medium mb-2">Photo proof</p>
            <Button variant="secondary" size="sm" icon={<Camera size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {proofPath ? "Change photo" : "Add photo"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadProof(f);
            }} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!denyOpen}
        onClose={() => setDenyOpen(null)}
        title="Deny request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDenyOpen(null)}>Cancel</Button>
            <Button variant="danger" loading={saving} disabled={!denyReason.trim()} onClick={() => denyOpen && review(denyOpen.id, "deny", denyReason)}>
              Deny with note
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason (shown to the member)"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
          placeholder="Explain what was missing or why this doesn't count..."
          className="min-h-[100px]"
        />
      </Modal>
    </Card>
  );
}
