import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertRowWithOptionalColumns, PHOTO_ALBUM_OPTIONAL_COLUMNS } from "@/lib/db-optional-columns";
import { getOrgPhotoPermissions } from "@/lib/photo-permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const albumId = searchParams.get("id");
  if (!orgId && !albumId) {
    return NextResponse.json({ error: "org_id or id required" }, { status: 400 });
  }

  if (albumId) {
    const { data, error } = await supabase.from("photo_albums").select("*").eq("id", albumId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("photo_albums")
    .select("*")
    .eq("org_id", orgId!)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, eventId } = await request.json();
  if (!orgId || !title) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }

  const perms = await getOrgPhotoPermissions(supabase, orgId);

  const { data, error } = await insertRowWithOptionalColumns(
    supabase,
    "photo_albums",
    {
      org_id: orgId,
      title,
      event_id: eventId || null,
      created_by: user.id,
      is_public: !perms.officer_only_albums,
      allow_member_upload: perms.who_can_upload === "all_members",
    },
    PHOTO_ALBUM_OPTIONAL_COLUMNS,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
