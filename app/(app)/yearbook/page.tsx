import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { BookOpen, Camera, Heart } from "lucide-react";
import { YearbookExportButton } from "@/components/yearbook/yearbook-export-button";
import { YearbookPrintTrigger } from "@/components/yearbook/yearbook-print-trigger";
import { YearbookPageExtras } from "@/components/yearbook/yearbook-page-extras";
import type { YearbookExportData } from "@/lib/yearbook-export";

export const metadata = { title: "Digital Yearbook" };
export const dynamic = "force-dynamic";

export default async function YearbookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, organizations(name)").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const orgId = m.org_id;
  const orgName = String(((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Chapter");

  const semesterStart = new Date();
  semesterStart.setMonth(semesterStart.getMonth() - 5);

  const [eventsRes, photosRes, albumsRes, sectionsRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at").eq("org_id", orgId).gte("starts_at", semesterStart.toISOString()).order("starts_at"),
    supabase.from("photos").select("id, url, caption, created_at, album_id, status").eq("org_id", orgId).eq("status", "approved").order("created_at", { ascending: false }).limit(48),
    supabase.from("photo_albums").select("id, title, event_id, cover_url").eq("org_id", orgId),
    supabase.from("yearbook_sections").select("*").eq("org_id", orgId).order("order_index"),
  ]);

  const events = (eventsRes.data ?? []) as Array<Record<string, unknown>>;
  const photos = (photosRes.data ?? []) as Array<Record<string, unknown>>;
  const albums = (albumsRes.data ?? []) as Array<Record<string, unknown>>;
  const customSections = (sectionsRes.data ?? []) as Array<Record<string, unknown>>;

  const albumByEvent = new Map(albums.filter((a) => a.event_id).map((a) => [String(a.event_id), a]));

  const exportData: YearbookExportData = {
    orgName,
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    photoCount: photos.length,
    events: events.map((e) => ({
      id: String(e.id),
      title: String(e.title),
      type: String(e.type),
      startsAt: String(e.starts_at),
      hasAlbum: albumByEvent.has(String(e.id)),
    })),
    photos: photos.map((p) => ({
      id: String(p.id),
      url: String(p.url),
      caption: p.caption ? String(p.caption) : null,
      createdAt: String(p.created_at),
    })),
    sections: customSections.map((s) => ({
      id: String(s.id),
      sectionType: String(s.section_type),
      title: String(s.title),
      body: s.body ? String(s.body) : null,
      personName: s.person_name ? String(s.person_name) : null,
      imageUrl: s.image_url ? String(s.image_url) : null,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Yearbook"
        description={`${orgName} semester scrapbook — events, memories, and approved photos`}
        action={
          <div className="flex items-center gap-2">
            <YearbookExportButton data={exportData} orgId={orgId} />
            <YearbookPrintTrigger
              disabled={events.length === 0 && photos.length === 0 && customSections.length === 0}
            />
            <Link href="/social" className="text-sm text-greek-600 hover:underline flex items-center gap-1">
              <Camera size={14} /> Manage photos
            </Link>
          </div>
        }
      />

      <Card padding="sm" className="bg-greek-50 dark:bg-greek-950/20 border-greek-200">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-greek-600" />
          <div>
            <p className="font-semibold text-sm">{events.length} events · {photos.length} approved photos</p>
            <p className="text-xs text-muted-foreground">Auto-compiled from your chapter activity this semester · Export as HTML for print/PDF</p>
          </div>
        </div>
      </Card>

      {events.length === 0 && photos.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} />}
          title="Your yearbook is empty"
          description="Host events and upload photos to Social — approved images appear here automatically."
        />
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3">Semester timeline</h2>
            <div className="space-y-3">
              {events.map((e) => {
                const album = albumByEvent.get(String(e.id));
                return (
                  <Card key={String(e.id)} padding="sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">{String(e.title)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(String(e.starts_at))} · {String(e.type).replace("_", " ")}</p>
                      </div>
                      {album ? (
                        <Badge label="Album linked" color="green" />
                      ) : (
                        <Badge label="No album yet" color="gray" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {customSections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Senior spotlights & awards</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {customSections.map((s) => (
                  <Card key={String(s.id)} padding="sm">
                    <p className="text-xs text-muted-foreground capitalize">{String(s.section_type).replace(/_/g, " ")}</p>
                    <p className="font-semibold text-sm">{String(s.title)}</p>
                    {s.person_name ? <p className="text-xs text-greek-600">{String(s.person_name)}</p> : null}
                    {s.body ? <p className="text-xs text-muted-foreground mt-1 line-clamp-4">{String(s.body)}</p> : null}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <YearbookPageExtras orgId={orgId} />

          {photos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Highlight reel</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {photos.map((p) => (
                  <div key={String(p.id)} className="aspect-square rounded-xl overflow-hidden bg-surface-2 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={String(p.url)} alt={String(p.caption ?? "Memory")} className="w-full h-full object-cover" />
                    {p.caption ? (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs line-clamp-2">{String(p.caption ?? "")}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
