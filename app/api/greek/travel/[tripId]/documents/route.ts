import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/png",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const orgId = String(formData.get("org_id") ?? "");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: trip } = await supabase
    .from("greek_travel_trips")
    .select("id")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Unsupported file — use PDF, DOCX, PNG, or JPG" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 15 MB" }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "document.pdf";
  const path = `travel/${orgId}/${tripId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage.from("documents").upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: doc, error } = await supabase.from("greek_trip_documents").insert({
    trip_id: tripId,
    filename: name,
    url: urlData.publicUrl,
    uploaded_by: profile?.id ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(doc, { status: 201 });
}
