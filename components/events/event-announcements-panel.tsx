"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Pin } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, EmptyState, Input, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

interface Announcement {
  id: string;
  title: string;
  body: string;
  author_name: string | null;
  pinned: boolean;
  created_at: string;
}

export function EventAnnouncementsPanel({
  eventId,
  orgId,
}: {
  eventId: string;
  orgId: string;
}) {
  const { can, loading: permLoading } = usePermissions();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    const res = await fetch(
      `/api/comms/announcements?org_id=${encodeURIComponent(orgId)}&event_id=${encodeURIComponent(eventId)}`,
    );
    if (res.ok) setAnnouncements((await res.json()) as Announcement[]);
    setLoading(false);
  }, [orgId, eventId]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const canPost = !permLoading && can("manage_events");

  async function postAnnouncement() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const res = await fetch("/api/comms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eventId,
        title: title.trim(),
        body: body.trim(),
        audience: ["all"],
        pinned: false,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not post announcement");
      return;
    }
    setTitle("");
    setBody("");
    setComposing(false);
    await loadAnnouncements();
    toast.success("Announcement posted");
  }

  return (
    <Card>
      <CardHeader
        title="Announcements"
        icon={<Megaphone size={16} />}
        description="Updates just for this event"
        action={
          canPost ? (
            <Button variant="secondary" size="sm" onClick={() => setComposing((v) => !v)}>
              {composing ? "Cancel" : "New update"}
            </Button>
          ) : undefined
        }
      />

      {composing && canPost && (
        <div className="space-y-3 mb-4 p-4 rounded-xl bg-surface-1 border border-border">
          <Input label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick headline..." />
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should everyone know?" className="min-h-[100px]" />
          <Button size="sm" onClick={postAnnouncement} loading={saving} disabled={!title.trim() || !body.trim()}>
            Post to event
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={20} />}
          title="No announcements yet"
          description={canPost ? "Post an update when plans change or details are confirmed." : "Check back here for event updates from your officers."}
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-4 bg-card">
              <div className="flex items-start gap-2">
                {a.pinned && <Pin size={14} className="text-greek-600 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.author_name ?? "Officer"} · {formatDateTime(a.created_at)}
                  </p>
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
