import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge,
  Card,
  EmptyState,
} from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Bell, Star, Zap } from "lucide-react";

export const metadata = { title: "Chapter Feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, organizations(name)").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const orgId = m.org_id;

  const [announcementsRes, eventsRes, photosRes] = await Promise.all([
    supabase.from("announcements").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
    supabase.from("events").select("id, title, type, starts_at, cover_image_url").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    supabase.from("photos").select("id, url, caption, created_at, uploader_name, likes").eq("org_id", orgId).eq("status", "approved").order("created_at", { ascending: false }).limit(6),
  ]);

  const announcements = (announcementsRes.data ?? []) as Array<Record<string, unknown>>;
  const events = (eventsRes.data ?? []) as Array<Record<string, unknown>>;
  const photos = (photosRes.data ?? []) as Array<Record<string, unknown>>;

  const orgName = String((m.organizations as unknown as Record<string, unknown>)?.name ?? "Your chapter");

  // Build a merged timeline
  type FeedItem = {
    id: string;
    type: "announcement" | "event" | "photo";
    created_at: string;
    data: Record<string, unknown>;
  };

  const timeline: FeedItem[] = [
    ...announcements.map((a) => ({ id: String(a.id), type: "announcement" as const, created_at: String(a.created_at), data: a })),
    ...events.map((e) => ({ id: String(e.id), type: "event" as const, created_at: String(e.starts_at), data: e })),
    ...photos.map((p) => ({ id: String(p.id), type: "photo" as const, created_at: String(p.created_at), data: p })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 bg-racing-50 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-racing-500 animate-pulse" />
          <span className="text-sm font-semibold text-racing-700">{orgName} · Private Feed</span>
        </div>
      </div>

      {timeline.length === 0 ? (
        <EmptyState
          icon={<Bell size={24} />}
          title="Feed is empty"
          description="Announcements, event reminders, and photo drops will appear here."
        />
      ) : (
        <>
          {timeline.map((item) => {
            if (item.type === "announcement") {
              const a = item.data;
              const isPinned = Boolean(a.pinned);
              return (
                <Card key={item.id} className={isPinned ? "border-yellow-300 dark:border-yellow-700" : ""}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPinned ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-racing-50"}`}>
                      {isPinned ? <Star size={16} className="text-yellow-500 fill-yellow-500" /> : <Bell size={16} className="text-racing" />}
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
                <a key={item.id} href={`/events/${String(e.id)}`}>
                  <Card className="hover:border-racing-300 transition-colors cursor-pointer overflow-hidden p-0">
                    {Boolean(e.cover_image_url) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={String(e.cover_image_url)} alt={String(e.title)} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-racing" />
                        <span className="text-xs font-semibold text-racing uppercase tracking-wide">Upcoming event</span>
                      </div>
                      <p className="font-bold text-foreground">{String(e.title)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(String(e.starts_at)).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    </div>
                  </Card>
                </a>
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
                        <div className="w-7 h-7 rounded-full bg-racing-100 flex items-center justify-center text-xs font-bold text-racing-700">
                          {String(p.uploader_name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{String(p.uploader_name ?? "Member")}</p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="text-xs">❤️ {Number(p.likes)}</span>
                      </div>
                    </div>
                    {Boolean(p.caption) && <p className="text-sm text-foreground mt-2">{String(p.caption)}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(String(p.created_at))}</p>
                  </div>
                </Card>
              );
            }

            return null;
          })}
        </>
      )}
    </div>
  );
}
