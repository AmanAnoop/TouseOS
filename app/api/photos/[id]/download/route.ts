import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { photoDisplayUrl } from "@/lib/photo-access";

/** Returns a full-resolution signed URL for saving to camera roll. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: photo } = await supabase
    .from("photos")
    .select("id, org_id, storage_path, url, caption, media_type")
    .eq("id", photoId)
    .single();

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", photo.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const downloadUrl = await photoDisplayUrl(supabase, photo, 86400);
  if (!downloadUrl) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  return NextResponse.json({
    download_url: downloadUrl,
    media_type: photo.media_type ?? "image",
    caption: photo.caption,
  });
}
