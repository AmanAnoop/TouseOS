import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { SemesterRewindButton } from "@/components/event-memories/semester-rewind-button";
import { EventMemoriesTimeline } from "@/components/event-memories/event-memories-timeline";
import { Camera } from "lucide-react";

export const metadata = { title: "Event Memories" };
export const dynamic = "force-dynamic";

export default async function EventMemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");
  const orgName = membership.orgName || "chapter";

  const [eventsRes, albumsRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at, ends_at, cover_image_url").eq("org_id", membership.orgId).lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(20),
    supabase.from("photo_albums").select("id, event_id, title, cover_url").eq("org_id", membership.orgId),
  ]);

  const events = (eventsRes.data ?? []) as Array<Record<string, unknown>>;
  const albums = (albumsRes.data ?? []) as Array<Record<string, unknown>>;

  const timelineEvents = events.map((event) => {
    const album = albums.find((a) => String(a.event_id) === String(event.id));
    return {
      id: String(event.id),
      title: String(event.title),
      type: String(event.type),
      starts_at: String(event.starts_at),
      cover_image_url: event.cover_image_url as string | null | undefined,
      album: album
        ? { id: String(album.id), cover_url: album.cover_url as string | null | undefined }
        : null,
    };
  });

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
        <EventMemoriesTimeline orgId={membership.orgId} events={timelineEvents} />
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
            <SemesterRewindButton orgId={membership.orgId} orgName={orgName} eventCount={events.length} />
          </div>
        </Card>
      )}
    </div>
  );
}
