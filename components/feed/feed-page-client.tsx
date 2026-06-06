"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedUpcomingEvents } from "@/components/feed/feed-upcoming-events";
import { Badge, Button, Card, EmptyState, Modal } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Bell, Star, Trash2 } from "lucide-react";

type FeedItem = {
  id: string;
  type: "announcement" | "event" | "photo";
  created_at: string;
  data: Record<string, unknown>;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type?: string;
  starts_at: string;
  location?: string | null;
  address?: string | null;
};

export function FeedPageClient({
  orgId,
  orgName,
  isOfficer,
  timeline,
  upcomingEvents,
}: {
  orgId: string;
  orgName: string;
  isOfficer: boolean;
  timeline: FeedItem[];
  upcomingEvents: UpcomingEvent[];
}) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(
      `/api/comms/announcements?id=${encodeURIComponent(deleteId)}&org_id=${encodeURIComponent(orgId)}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Could not delete");
      return;
    }
    toast.success("Announcement removed");
    setDeleteId(null);
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center py-2" style={{ marginBottom: 24 }}>
        <div className="inline-flex items-center gap-2 bg-greek-50 dark:bg-greek-950/30 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-greek-500 animate-pulse" />
          <span className="text-sm font-semibold text-greek-700 dark:text-greek-400">{orgName} · Private Feed</span>
        </div>
      </div>

      {isOfficer && (
        <div className="ds-feed-composer-wrap">
          <FeedComposer orgId={orgId} onPosted={() => router.refresh()} />
        </div>
      )}

      <FeedUpcomingEvents events={upcomingEvents} />

      <div className="ds-page-stack" style={{ marginTop: 24 }}>
        {timeline.length === 0 && upcomingEvents.length === 0 ? (
          <EmptyState
            icon={<Bell size={24} />}
            title="Feed is empty"
            description="Announcements, event reminders, and photo drops will appear here."
          />
        ) : (
          timeline.map((item) => {
            if (item.type === "announcement") {
              const a = item.data;
              const isPinned = Boolean(a.pinned);
              return (
                <Card key={item.id} className={isPinned ? "border-yellow-300 dark:border-yellow-700" : ""}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPinned ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-greek-50 dark:bg-greek-950/30"}`}>
                      {isPinned ? <Star size={16} className="text-yellow-500 fill-yellow-500" /> : <Bell size={16} className="text-greek-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{String(a.title)}</p>
                        {isPinned && <Badge label="Pinned" color="yellow" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{String(a.body)}</p>
                      <p className="text-xs text-muted-foreground mt-2">{String(a.author_name ?? "Officer")} · {timeAgo(String(a.created_at))}</p>
                    </div>
                    {isOfficer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        aria-label="Delete announcement"
                        onClick={() => {
                          setDeleteId(item.id);
                          setDeleteTitle(String(a.title));
                        }}
                      />
                    )}
                  </div>
                </Card>
              );
            }

            if (item.type === "photo") {
              const p = item.data;
              return (
                <Card key={item.id} className="overflow-hidden p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={String(p.url)} alt={String(p.caption ?? "")} className="w-full aspect-square object-cover" />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-greek-100 dark:bg-greek-950/50 flex items-center justify-center text-xs font-bold text-greek-700">
                          {String(p.uploader_name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{String(p.uploader_name ?? "Member")}</p>
                      </div>
                    </div>
                    {Boolean(p.caption) && <p className="text-sm text-foreground mt-2">{String(p.caption)}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(String(p.created_at))}</p>
                  </div>
                </Card>
              );
            }

            return null;
          })
        )}
      </div>

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete announcement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Remove &ldquo;{deleteTitle}&rdquo; from the chapter feed? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
