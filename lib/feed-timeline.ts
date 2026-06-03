import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedTimelineItem = {
  id: string;
  type: "announcement" | "event" | "photo";
  created_at: string;
  data: Record<string, unknown>;
};

export async function loadFeedTimeline(
  supabase: SupabaseClient,
  orgId: string,
) {
  const [announcementsRes, eventsRes, photosRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("events")
      .select("id, title, type, starts_at, cover_image_url")
      .eq("org_id", orgId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(3),
    supabase
      .from("photos")
      .select("id, url, caption, created_at, uploader_name, likes")
      .eq("org_id", orgId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const announcements = (announcementsRes.data ?? []) as Array<Record<string, unknown>>;
  const events = (eventsRes.data ?? []) as Array<Record<string, unknown>>;
  const photos = (photosRes.data ?? []) as Array<Record<string, unknown>>;

  const timeline: FeedTimelineItem[] = [
    ...announcements.map((a) => ({
      id: String(a.id),
      type: "announcement" as const,
      created_at: String(a.created_at),
      data: a,
    })),
    ...events.map((e) => ({
      id: String(e.id),
      type: "event" as const,
      created_at: String(e.starts_at),
      data: e,
    })),
    ...photos.map((p) => ({
      id: String(p.id),
      type: "photo" as const,
      created_at: String(p.created_at),
      data: p,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { announcements, events, photos, timeline };
}
