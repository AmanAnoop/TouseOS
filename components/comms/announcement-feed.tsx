"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Badge, Button, Card, EmptyState, Modal } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Announcement } from "@/types";

interface AnnouncementFeedProps {
  announcements: Announcement[];
  loading?: boolean;
  query?: string;
  orgId?: string;
  canDelete?: boolean;
  onDeleted?: () => void;
}

export function AnnouncementFeed({
  announcements, loading, query = "", orgId, canDelete, onDeleted,
}: AnnouncementFeedProps) {
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget || !orgId) return;
    setDeleting(true);
    const res = await fetch(
      `/api/comms/announcements?id=${encodeURIComponent(deleteTarget.id)}&org_id=${encodeURIComponent(orgId)}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to delete");
      return;
    }
    toast.success("Announcement deleted");
    setDeleteTarget(null);
    onDeleted?.();
  }

  const filtered = announcements.filter((a) => {
    const q = query.toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Send size={20} />}
        title="No announcements"
        description="Post your first announcement to keep members informed."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {filtered.map((a) => (
          <Card key={a.id} padding="sm" className={a.pinned ? "border-greek-300 bg-greek-50/50 dark:bg-greek-950/10" : ""}>
            <div className="flex items-start gap-3">
              <Avatar name={a.author_name ?? "Officer"} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-foreground">{a.title}</p>
                  {a.pinned && <Badge label="Pinned" color="blue" />}
                  {a.audience?.[0] && a.audience[0] !== "all" && (
                    <Badge label={a.audience[0].replace("_", " ")} color="gray" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.author_name ?? "Officer"} · {timeAgo(a.created_at)}
                </p>
                <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{a.body}</p>
              </div>
              {canDelete && orgId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteTarget(a)}
                  aria-label="Delete announcement"
                  style={{ minHeight: 44, minWidth: 44 }}
                />
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete announcement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="type-body" style={{ margin: 0 }}>
          Permanently delete &ldquo;{deleteTarget?.title}&rdquo;? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}

export const COMMS_AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "officers", label: "Officers only" },
  { value: "new_members", label: "New members" },
  { value: "unpaid", label: "Unpaid members" },
  { value: "alumni", label: "Alumni/Alumnae" },
];
