import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberProfileForUser } from "@/lib/point-access";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);

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

  const profile = await getMemberProfileForUser(supabase, orgId, user.id);
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mime = file.type || "image/jpeg";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Please upload a photo (JPEG, PNG, or WebP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 12 MB" }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "proof.jpg";
  const path = `${orgId}/point-proofs/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: stored, error } = await supabase.storage.from("photos").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ storagePath: stored.path }, { status: 201 });
}
