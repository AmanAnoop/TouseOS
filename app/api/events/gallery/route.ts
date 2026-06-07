import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attachPhotoDisplayUrls, photoDisplayUrl } from "@/lib/photo-access";
import { can, type RoleName } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");
  const orgId = searchParams.get("org_id");
  const sort = searchParams.get("sort") === "likes" ? "likes" : "recent";

  if (!eventId || !orgId) {
    return NextResponse.json({ error: "event_id and org_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = String(membership.role) as RoleName;
  const isOfficer = can(role, "approve_photos") || can(role, "manage_events");

  const { data: album } = await supabase
    .from("photo_albums")
    .select("id, require_upload_approval")
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!album) {
    return NextResponse.json({ album: null, photos: [], pending: [] });
  }

  let query = supabase
    .from("photos")
    .select("*")
    .eq("album_id", album.id);

  if (!isOfficer) {
    query = query.in("status", ["approved", "chapter_only"]);
  }

  const { data: photos, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = photos ?? [];
  const photoIds = rows.map((p) => p.id);

  const [{ data: likes }, { data: myLikes }] = await Promise.all([
    photoIds.length
      ? supabase.from("photo_likes").select("photo_id").in("photo_id", photoIds)
      : Promise.resolve({ data: [] }),
    photoIds.length
      ? supabase.from("photo_likes").select("photo_id").eq("user_id", user.id).in("photo_id", photoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const likeCounts = new Map<string, number>();
  for (const l of likes ?? []) {
    const pid = String(l.photo_id);
    likeCounts.set(pid, (likeCounts.get(pid) ?? 0) + 1);
  }

  const myLikeSet = new Set((myLikes ?? []).map((l) => String(l.photo_id)));

  const withUrls = await attachPhotoDisplayUrls(supabase, rows as Array<{ url?: string; storage_path?: string }>);

  type PhotoRow = { id: string; likes?: number; created_at: string; status: string } & typeof withUrls[number];

  const enriched = await Promise.all(
    withUrls.map(async (p) => {
      const row = p as PhotoRow;
      const originalUrl = await photoDisplayUrl(supabase, p, 86400);
      return {
        ...row,
        url: p.display_url ?? p.url,
        original_url: originalUrl,
        like_count: likeCounts.get(row.id) ?? Number(row.likes ?? 0),
        liked_by_me: myLikeSet.has(row.id),
      };
    }),
  );

  enriched.sort((a, b) => {
    if (sort === "likes") return (b.like_count as number) - (a.like_count as number);
    return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
  });

  const pending = isOfficer
    ? enriched.filter((p) => p.status === "pending")
    : [];

  const visible = enriched.filter((p) => p.status !== "pending");

  return NextResponse.json({
    album: { id: album.id, require_upload_approval: album.require_upload_approval },
    photos: visible,
    pending,
    sort,
  });
}
