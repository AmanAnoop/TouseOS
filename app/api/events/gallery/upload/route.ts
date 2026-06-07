import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/api-org-role";
import { canUploadPhotos, getOrgPhotoPermissions } from "@/lib/photo-permissions";

const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const orgId = String(formData.get("org_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!orgId || !eventId) {
    return NextResponse.json({ error: "org_id and event_id required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, orgId);
  const perms = await getOrgPhotoPermissions(supabase, orgId);
  if (!role || !canUploadPhotos(role, perms)) {
    return NextResponse.json({ error: "Your chapter restricts uploads to officers or the PR team" }, { status: 403 });
  }

  const mime = file.type || "image/jpeg";
  const isVideo = VIDEO_TYPES.has(mime);
  const isImage = IMAGE_TYPES.has(mime);
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "Please upload a photo or video file" }, { status: 400 });
  }

  const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > maxSize) {
    return NextResponse.json({
      error: isVideo ? "Videos must be under 100 MB" : "Photos must be under 25 MB",
    }, { status: 400 });
  }

  const { data: album } = await supabase
    .from("photo_albums")
    .select("id, require_upload_approval")
    .eq("org_id", orgId)
    .eq("event_id", eventId)
    .maybeSingle();

  let albumId = album?.id;
  if (!albumId) {
    const { data: event } = await supabase.from("events").select("title").eq("id", eventId).single();
    const { data: created, error: albumErr } = await supabase
      .from("photo_albums")
      .insert({
        org_id: orgId,
        event_id: eventId,
        title: `${event?.title ?? "Event"} — Photos`,
        allow_member_upload: true,
      })
      .select("id, require_upload_approval")
      .single();
    if (albumErr || !created) {
      return NextResponse.json({ error: albumErr?.message ?? "Could not create album" }, { status: 500 });
    }
    albumId = created.id;
  }

  const name = file instanceof File ? file.name : isVideo ? "video.mp4" : "photo.jpg";
  const path = `${orgId}/events/${eventId}/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: stored, error: uploadErr } = await supabase.storage.from("photos").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const albumRequiresApproval = Boolean(album?.require_upload_approval);
  const status = albumRequiresApproval || perms.require_approval ? "pending" : "approved";

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { data: photo, error: insertErr } = await supabase
    .from("photos")
    .insert({
      org_id: orgId,
      album_id: albumId,
      uploaded_by: user.id,
      uploader_name: profile?.full_name ?? null,
      storage_path: stored.path,
      url: stored.path,
      caption,
      status,
      media_type: isVideo ? "video" : "image",
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ photo, pending: status === "pending" }, { status: 201 });
}
