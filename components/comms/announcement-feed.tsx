"use client";

import { Send } from "lucide-react";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Announcement } from "@/types";

interface AnnouncementFeedProps {
  announcements: Announcement[];
  loading?: boolean;
  query?: string;
}

export function AnnouncementFeed({ announcements, loading, query = "" }: AnnouncementFeedProps) {
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
    <div className="space-y-3">
      {filtered.map((a) => (
        <Card key={a.id} padding="sm" className={a.pinned ? "border-racing-300 bg-racing-50/50 dark:bg-greek-950/10" : ""}>
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
          </div>
        </Card>
      ))}
    </div>
  );
}

export const COMMS_AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "officers", label: "Officers only" },
  { value: "new_members", label: "New members" },
  { value: "unpaid", label: "Unpaid members" },
  { value: "alumni", label: "Alumni/Alumnae" },
];
