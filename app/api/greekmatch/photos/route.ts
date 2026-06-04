import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { photoDisplayUrl } from "@/lib/photo-access";

const MAX = 6;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function resolveStoredPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: unknown,
): Promise<{ paths: string[]; display: string[] }> {
  if (!Array.isArray(raw)) return { paths: [], display: [] };
  const paths: string[] = [];
  const display: string[] = [];
  for (const p of raw) {
    const s = String(p);
    if (s.startsWith("http")) {
      paths.push(s);
      display.push(s);
      continue;
    }
    paths.push(s);
    const url = await photoDisplayUrl(supabase, { storage_path: s });
    display.push(url ?? s);
  }
  return { paths, display };
}

/** Resolve display URLs for profile photo editor */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("greekmatch_profiles")
    .select("photos")
    .eq("user_id", user.id)
    .maybeSingle();

  const { display } = await resolveStoredPhotos(supabase, profile?.photos);
  return NextResponse.json({ photos: display });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const mime = file.type || "image/jpeg";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Use JPEG, PNG, or WebP" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("greekmatch_profiles")
    .select("photos")
    .eq("user_id", user.id)
    .maybeSingle();

  const { paths } = await resolveStoredPhotos(supabase, profile?.photos);
  if (paths.length >= MAX) {
    return NextResponse.json({ error: `Maximum ${MAX} photos` }, { status: 400 });
  }

  const name = file instanceof File ? file.name : "photo.jpg";
  const path = `greekmatch/${user.id}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from("photos").upload(path, buffer, {
    contentType: mime,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const nextPaths = [...paths, path];

  const { data, error } = await supabase
    .from("greekmatch_profiles")
    .update({ photos: nextPaths })
    .eq("user_id", user.id)
    .select("photos")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { display } = await resolveStoredPhotos(supabase, data?.photos ?? nextPaths);
  return NextResponse.json({ photos: display, storagePath: path });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const index = parseInt(new URL(request.url).searchParams.get("index") ?? "-1", 10);
  const { data: profile } = await supabase
    .from("greekmatch_profiles")
    .select("photos")
    .eq("user_id", user.id)
    .single();

  const { paths } = await resolveStoredPhotos(supabase, profile?.photos);
  if (index < 0 || index >= paths.length) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }
  paths.splice(index, 1);

  const { data, error } = await supabase
    .from("greekmatch_profiles")
    .update({ photos: paths })
    .eq("user_id", user.id)
    .select("photos")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { display } = await resolveStoredPhotos(supabase, data?.photos ?? paths);
  return NextResponse.json({ photos: display });
}
