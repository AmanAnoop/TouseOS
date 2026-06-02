import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Calendar, Camera, Clock, Download, Image } from "lucide-react";

export const metadata = { title: "Event Memories" };
export const dynamic = "force-dynamic";

export default async function EventMemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const [eventsRes, albumsRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at, ends_at, cover_image_url").eq("org_id", m.org_id).lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(20),
    supabase.from("photo_albums").select("id, event_id, title, cover_url").eq("org_id", m.org_id),
  ]);

  const events = (eventsRes.data ?? []) as Array<Record<string, unknown>>;
  const albums = (albumsRes.data ?? []) as Array<Record<string, unknown>>;

  const albumMap = new Map(albums.map((a) => [String(a.event_id), a]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Memories"
        description="A semester timeline of your chapter's best moments"
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<Camera size={24} />}
          title="No past events yet"
          description="Your event memories will appear here after you host events."
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border hidden sm:block" />

          <div className="space-y-6">
            {events.map((event) => {
              const album = albumMap.get(String(event.id));
              return (
                <div key={String(event.id)} className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-border bg-card flex items-center justify-center hidden sm:flex z-10">
                    <Calendar size={14} className="text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground">{String(event.title)}</h3>
                          <Badge label={String(event.type).replace(/_/g, " ")} color="blue" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Clock size={11} />
                          {formatDate(String(event.starts_at))}
                        </div>
                      </div>
                      {album && (
                        <a href={`/social`} className="flex items-center gap-1 text-xs text-racing hover:underline flex-shrink-0">
                          <Image size={12} />
                          View album
                        </a>
                      )}
                    </div>

                    {/* Event cover or album preview */}
                    {Boolean(event.cover_image_url || album?.cover_url) && (
                      <div className="rounded-xl overflow-hidden mb-3 bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={String(album?.cover_url ?? event.cover_image_url)}
                          alt={String(event.title)}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}

                    {!event.cover_image_url && !album && (
                      <div className="h-24 rounded-xl bg-gradient-to-br from-greek-100 to-greek-200 dark:from-greek-950/30 dark:to-greek-900/30 flex items-center justify-center mb-3">
                        <div className="text-center">
                          <Camera size={20} className="mx-auto text-greek-400 mb-1" />
                          <p className="text-xs text-greek-500">No photos yet</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Semester rewind CTA */}
      {events.length > 3 && (
        <Card className="bg-gradient-to-br from-greek-600 to-greek-800 border-transparent">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white text-lg">Generate semester rewind</p>
              <p className="text-white/80 text-sm mt-0.5">
                Auto-generate a PDF recap with top photos, stats, and highlights from {events.length} events.
              </p>
            </div>
            <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex-shrink-0">
              <Download size={16} />
              Generate
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
