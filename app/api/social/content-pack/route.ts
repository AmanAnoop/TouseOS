import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { photoDisplayUrl } from "@/lib/photo-access";
import { can, type RoleName } from "@/lib/permissions";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, photoIds, caption, albumTitle } = await request.json();
  if (!orgId || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "orgId and photoIds required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "approve_photos") && !can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, url, caption")
    .eq("org_id", orgId)
    .in("id", photoIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!photos?.length) return NextResponse.json({ error: "No photos found" }, { status: 404 });

  const zip = new JSZip();
  const manifest: string[] = [
    `TouseOS Content Pack`,
    `Album: ${albumTitle ?? "Chapter photos"}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `CAPTION:`,
    caption || "(no caption provided)",
    ``,
    `PHOTOS (${photos.length}):`,
  ];

  let index = 0;
  for (const photo of photos) {
    index += 1;
    const displayUrl = await photoDisplayUrl(supabase, photo);
    manifest.push(`${index}. ${photo.caption ?? "Untitled"} — ${displayUrl ?? photo.url ?? photo.id}`);

    if (photo.storage_path) {
      const { data: blob, error: dlErr } = await supabase.storage
        .from("photos")
        .download(photo.storage_path);
      if (!dlErr && blob) {
        const ext = photo.storage_path.split(".").pop() ?? "jpg";
        zip.file(`photos/${String(index).padStart(2, "0")}-${photo.id.slice(0, 8)}.${ext}`, blob);
      }
    }
  }

  manifest.push("", "PR: Review for alcohol, non-members, consent, and chapter guidelines before posting.");
  zip.file("README.txt", manifest.join("\n"));
  zip.file("caption.txt", caption || "");

  const zipBlob = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `content-pack-${(albumTitle ?? "album").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;

  return new NextResponse(new Uint8Array(zipBlob), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
