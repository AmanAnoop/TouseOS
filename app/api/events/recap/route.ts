import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, orgId } = await request.json();
  if (!eventId || !orgId) {
    return NextResponse.json({ error: "eventId and orgId required" }, { status: 400 });
  }

  const [eventRes, rsvpRes, albumRes, photosRes] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at, description, location").eq("id", eventId).eq("org_id", orgId).single(),
    supabase.from("event_rsvps").select("status").eq("event_id", eventId),
    supabase.from("photo_albums").select("id, title").eq("event_id", eventId).maybeSingle(),
    supabase
      .from("photos")
      .select("id, url, caption, status")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("likes", { ascending: false })
      .limit(6),
  ]);

  const event = eventRes.data;
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const rsvps = rsvpRes.data ?? [];
  const going = rsvps.filter((r) => r.status === "going").length;
  const photos = photosRes.data ?? [];

  let albumPhotos: typeof photos = [];
  if (albumRes.data?.id) {
    const { data } = await supabase
      .from("photos")
      .select("id, url, caption, status")
      .eq("album_id", albumRes.data.id)
      .in("status", ["approved", "chapter_only"])
      .order("created_at", { ascending: false })
      .limit(8);
    albumPhotos = data ?? [];
  }

  const topPhotos = (albumPhotos.length > 0 ? albumPhotos : photos).slice(0, 6);
  const eventType = String(event.type).replace(/_/g, " ");
  const dateStr = new Date(String(event.starts_at)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const storySlides = [
    `✨ ${event.title}`,
    `${dateStr}${event.location ? ` · ${event.location}` : ""}`,
    going > 0 ? `${going} members showed up` : "Thanks to everyone who came out",
    topPhotos.length > 0 ? `${topPhotos.length} highlight photos in the album` : "More photos coming soon in Touse Social",
    "Save & share — tag your chapter 💚",
  ];

  const feedCaption = [
    `What a ${eventType} 🎉`,
    "",
    `${event.title} was one for the books. ${going > 0 ? `${going} of us came through.` : "Grateful for everyone who made it special."}`,
    event.description ? String(event.description).slice(0, 200) : "",
    "",
    "📸 Swipe for highlights · Drop your favorites in the app",
    "#GreekLife #ChapterEvents",
  ].filter(Boolean).join("\n");

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "event_recap_generated",
    resource_type: "events",
    resource_id: eventId,
    metadata: { photo_count: topPhotos.length, rsvp_going: going },
  });

  return NextResponse.json({
    event: { id: event.id, title: event.title, type: event.type, starts_at: event.starts_at },
    stats: { rsvpGoing: going, photoCount: topPhotos.length },
    feedCaption,
    storySlides,
    photos: topPhotos.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
  });
}
