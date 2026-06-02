import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, albumId, url, storagePath, caption } = await request.json();

  const { data, error } = await supabase.from("photos").insert({
    org_id: orgId,
    album_id: albumId,
    uploaded_by: user.id,
    url,
    storage_path: storagePath,
    caption: caption ?? null,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, status, isInstagramReady, isOfficerOnly, doNotPost, alcoholFlagged } = await request.json();

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === "approved") { updates.approved_by = user.id; updates.approved_at = new Date().toISOString(); }
  }
  if (isInstagramReady !== undefined) updates.is_instagram_ready = isInstagramReady;
  if (isOfficerOnly !== undefined) updates.is_officer_only = isOfficerOnly;
  if (doNotPost !== undefined) updates.do_not_post = doNotPost;
  if (alcoholFlagged !== undefined) updates.alcohol_flagged = alcoholFlagged;

  const { data, error } = await supabase.from("photos").update(updates).eq("id", photoId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
