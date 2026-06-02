"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FeedComposer } from "@/components/feed/feed-composer";
import { Badge, Card, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Bell, Star, Zap } from "lucide-react";

type FeedItem = {
  id: string;
  type: "announcement" | "event" | "photo";
  created_at: string;
  data: Record<string, unknown>;
};

export function FeedPageClient({
  orgId,
  orgName,
  isOfficer,
  timeline,
}: {
  orgId: string;
  orgName: string;
  isOfficer: boolean;
  timeline: FeedItem[];
}) {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 bg-greek-50 dark:bg-greek-950/30 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-greek-500 animate-pulse" />
          <span className="text-sm font-semibold text-greek-700 dark:text-greek-400">{orgName} · Private Feed</span>
        </div>
      </div>

      {isOfficer && (
        <FeedComposer orgId={orgId} onPosted={() => router.refresh()} />
      )}

      {timeline.length === 0 ? (
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
                </div>
              </Card>
            );
          }

          if (item.type === "event") {
            const e = item.data;
            return (
              <Link key={item.id} href={`/events/${String(e.id)}`}>
                <Card className="hover:border-greek-300 transition-colors cursor-pointer overflow-hidden p-0">
                  {Boolean(e.cover_image_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(e.cover_image_url)} alt={String(e.title)} className="w-full h-36 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className="text-greek-600" />
                      <span className="text-xs font-semibold text-greek-600 uppercase tracking-wide">Upcoming event</span>
                    </div>
                    <p className="font-bold text-foreground">{String(e.title)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(String(e.starts_at)).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </Card>
              </Link>
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
                    <span className="text-xs text-muted-foreground">❤️ {Number(p.likes)}</span>
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
  );
}
