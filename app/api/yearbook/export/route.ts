import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildYearbookHtml } from "@/lib/yearbook-export";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgIdParam = new URL(request.url).searchParams.get("org_id");

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, organizations(name)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!m) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const orgId = orgIdParam && orgIdParam === m.org_id ? orgIdParam : m.org_id;
  const orgName = String(((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Chapter");

  const semesterStart = new Date();
  semesterStart.setMonth(semesterStart.getMonth() - 5);

  const [eventsRes, photosRes, albumsRes, sectionsRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at").eq("org_id", orgId).gte("starts_at", semesterStart.toISOString()).order("starts_at"),
    supabase.from("photos").select("id, url, caption, created_at").eq("org_id", orgId).eq("status", "approved").order("created_at", { ascending: false }).limit(48),
    supabase.from("photo_albums").select("id, event_id").eq("org_id", orgId),
    supabase.from("yearbook_sections").select("*").eq("org_id", orgId).order("order_index"),
  ]);

  const events = eventsRes.data ?? [];
  const photos = photosRes.data ?? [];
  const albums = albumsRes.data ?? [];
  const customSections = sectionsRes.data ?? [];
  const albumByEvent = new Map(albums.filter((a) => a.event_id).map((a) => [String(a.event_id), a]));

  const html = buildYearbookHtml({
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
  });

  const filename = `${orgName.toLowerCase().replace(/\s+/g, "-")}-yearbook.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
