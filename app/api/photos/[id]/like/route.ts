import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: photo } = await supabase.from("photos").select("id, org_id").eq("id", photoId).single();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", photo.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("photo_likes").upsert(
    { photo_id: photoId, user_id: user.id },
    { onConflict: "photo_id,user_id", ignoreDuplicates: true },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabase
    .from("photo_likes")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", photoId);

  return NextResponse.json({ liked: true, like_count: count ?? 0 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", user.id);

  const { count } = await supabase
    .from("photo_likes")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", photoId);

  return NextResponse.json({ liked: false, like_count: count ?? 0 });
}
