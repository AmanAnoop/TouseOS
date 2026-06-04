import { NextResponse } from "next/server";
import { photoDisplayUrl } from "@/lib/photo-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("photo_id");
  const orgId = searchParams.get("org_id");
  if (!photoId || !orgId) {
    return NextResponse.json({ error: "photo_id and org_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: photo, error } = await supabase
    .from("photos")
    .select("id, url, storage_path, org_id, status, is_officer_only")
    .eq("id", photoId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const url = await photoDisplayUrl(supabase, photo);
  if (!url) return NextResponse.json({ error: "Could not resolve image" }, { status: 500 });

  return NextResponse.json({ url, expiresIn: 3600 });
}
