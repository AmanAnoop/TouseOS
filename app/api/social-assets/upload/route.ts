import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Unsupported file type — use JPG, PNG, GIF, WebP, or PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 15 MB" }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "asset.bin";
  const path = `${orgId}/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: stored, error } = await supabase.storage.from("documents").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(stored.path);

  return NextResponse.json({
    storagePath: stored.path,
    fileUrl: urlData.publicUrl,
    filename: name,
  }, { status: 201 });
}
