import { NextResponse } from "next/server";
import { attachPhotoDisplayUrls } from "@/lib/photo-access";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { getMemberRole } from "@/lib/api-org-role";
import {
  canUploadPhotos,
  getOrgPhotoPermissions,
  initialInstagramReady,
  initialPhotoStatus,
} from "@/lib/photo-permissions";

async function withDisplayUrls<T extends { url?: string | null; storage_path?: string | null }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: T[],
) {
  const resolved = await attachPhotoDisplayUrls(supabase, rows);
  return resolved.map((p) => ({ ...p, url: p.display_url ?? p.url }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("album_id");
  const orgId = searchParams.get("org_id");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  if (albumId) {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("album_id", albumId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await withDisplayUrls(supabase, (data ?? []) as Array<{ url?: string; storage_path?: string }>));
  }

  if (orgId) {
    const { data, error } = await supabase
      .from("photos")
      .select("id, url, storage_path, caption, uploader_name, created_at, status, album_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(await withDisplayUrls(supabase, (data ?? []) as Array<{ url?: string; storage_path?: string }>));
  }

  return NextResponse.json({ error: "album_id or org_id required" }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, albumId, url, storagePath, caption } = await request.json();

  if (!storagePath || !orgId) {
    return NextResponse.json({ error: "storagePath and orgId required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const perms = await getOrgPhotoPermissions(supabase, String(orgId));
  if (!role || !canUploadPhotos(role, perms)) {
    return NextResponse.json({ error: "Your chapter restricts photo uploads to officers or the PR team" }, { status: 403 });
  }

  const status = initialPhotoStatus(perms);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const resolvedUrl = url ?? storagePath;

  const { data, error } = await supabase.from("photos").insert({
    org_id: orgId,
    album_id: albumId,
    uploaded_by: user.id,
    uploader_name: profile?.full_name ?? null,
    url: resolvedUrl,
    storage_path: storagePath,
    caption: caption ?? null,
    status,
    is_instagram_ready: initialInstagramReady(perms, status),
    approved_by: status === "approved" ? user.id : null,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, status, isInstagramReady, isOfficerOnly, doNotPost, alcoholFlagged } = await request.json();

  const { data: before } = await supabase.from("photos").select("status, uploaded_by, org_id, caption").eq("id", photoId).single();
  const perms = before?.org_id
    ? await getOrgPhotoPermissions(supabase, String(before.org_id))
    : null;

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === "approved") {
      updates.approved_by = user.id;
      updates.approved_at = new Date().toISOString();
      if (isInstagramReady === undefined && perms?.auto_instagram_ready) {
        updates.is_instagram_ready = true;
      }
    }
  }
  if (isInstagramReady !== undefined) updates.is_instagram_ready = isInstagramReady;
  if (isOfficerOnly !== undefined) updates.is_officer_only = isOfficerOnly;
  if (doNotPost !== undefined) updates.do_not_post = doNotPost;
  if (alcoholFlagged !== undefined) updates.alcohol_flagged = alcoholFlagged;

  const { data, error } = await supabase.from("photos").update(updates).eq("id", photoId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (
    status === "approved"
    && before?.status !== "approved"
    && before?.uploaded_by
    && before.uploaded_by !== user.id
  ) {
    await createNotification(supabase, {
      userId: String(before.uploaded_by),
      orgId: String(before.org_id),
      type: "photo_approval",
      title: "Photo approved",
      body: before.caption ? `"${before.caption}" was approved for posting.` : "Your photo was approved for posting.",
      link: "/social",
    });
  }

  return NextResponse.json(data);
}
