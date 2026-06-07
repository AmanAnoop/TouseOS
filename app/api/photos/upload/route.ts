import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/api-org-role";
import { canUploadPhotos, getOrgPhotoPermissions } from "@/lib/photo-permissions";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const orgId = String(formData.get("org_id") ?? "");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const role = await getMemberRole(supabase, user.id, orgId);
  const perms = await getOrgPhotoPermissions(supabase, orgId);
  if (!role || !canUploadPhotos(role, perms)) {
    return NextResponse.json({ error: "Your chapter restricts photo uploads to officers or the PR team" }, { status: 403 });
  }

  const mime = file.type || "image/jpeg";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 12 MB" }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "upload.jpg";
  const path = `${orgId}/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: stored, error } = await supabase.storage.from("photos").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ storagePath: stored.path, bucket: "photos" }, { status: 201 });
}
