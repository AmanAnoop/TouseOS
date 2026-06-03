import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { YearbookPrintClient } from "@/components/yearbook/yearbook-print-client";
import { attachPhotoDisplayUrls } from "@/lib/photo-access";
import type { YearbookExportData } from "@/lib/yearbook-export";

export const dynamic = "force-dynamic";
export const metadata = { title: "Print Yearbook" };

export default async function YearbookPrintPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const orgId = membership.orgId;
  const orgName = membership.orgName || "Chapter";

  const semesterStart = new Date();
  semesterStart.setMonth(semesterStart.getMonth() - 5);

  const [eventsRes, photosRes, albumsRes, sectionsRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at").eq("org_id", orgId).gte("starts_at", semesterStart.toISOString()).order("starts_at"),
    supabase.from("photos").select("id, url, storage_path, caption, created_at").eq("org_id", orgId).eq("status", "approved").order("created_at", { ascending: false }).limit(48),
    supabase.from("photo_albums").select("id, event_id").eq("org_id", orgId),
    supabase.from("yearbook_sections").select("*").eq("org_id", orgId).order("order_index"),
  ]);

  const events = eventsRes.data ?? [];
  const photosRaw = (photosRes.data ?? []) as Array<{ id: string; url?: string; storage_path?: string; caption?: string | null; created_at: string }>;
  const photosResolved = await attachPhotoDisplayUrls(supabase, photosRaw);
  const photos = photosResolved.map((p) => ({ ...p, url: p.display_url ?? p.url }));
  const albums = albumsRes.data ?? [];
  const customSections = sectionsRes.data ?? [];
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

  return <YearbookPrintClient data={exportData} />;
}
