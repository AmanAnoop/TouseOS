"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FeedComposer } from "@/components/feed/feed-composer";
import { Badge, Card, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Bell, Calendar, Star, Zap } from "lucide-react";

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
    <div className="max-w-xl mx-auto space-y-6 px-1">
      <div className="text-center py-3">
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
        <div className="space-y-5">
          {timeline.map((item) => {
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
                      <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">{String(a.body)}</p>
                      <p className="text-xs text-muted-foreground mt-2.5">{String(a.author_name ?? "Officer")} · {timeAgo(String(a.created_at))}</p>
                    </div>
                  </div>
                </Card>
              );
            }

            if (item.type === "event") {
              const e = item.data;
              const startsAt = new Date(String(e.starts_at));
              const dateLabel = startsAt.toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              });
              const timeLabel = startsAt.toLocaleTimeString("en-US", {
                hour: "numeric", minute: "2-digit",
              });
              return (
                <Link key={item.id} href={`/events/${String(e.id)}`}>
                  <Card className="hover:border-greek-300 transition-colors cursor-pointer p-0 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center flex-shrink-0">
                        <Zap size={16} className="text-greek-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-greek-600 uppercase tracking-wide">Upcoming</span>
                          {Boolean(e.type) && (
                            <Badge label={String(e.type)} color="blue" />
                          )}
                        </div>
                        <p className="font-medium text-sm text-foreground truncate mt-0.5">{String(e.title)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {dateLabel} · {timeLabel}
                          {Boolean(e.location) && <span className="truncate">· {String(e.location)}</span>}
                        </p>
                      </div>
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
                    <p className="text-xs text-muted-foreground mt-1.5">{timeAgo(String(p.created_at))}</p>
                  </div>
                </Card>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
