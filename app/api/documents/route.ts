import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/api-org-role";

async function attachUploaderNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<Record<string, unknown>>,
) {
  const uploaderIds = [
    ...new Set(
      rows.map((r) => r.uploaded_by).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (uploaderIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uploaderIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [String(p.id), String(p.full_name ?? "Member")]),
  );

  return rows.map((row) => ({
    ...row,
    uploaded_by_name: row.uploaded_by
      ? nameById.get(String(row.uploaded_by)) ?? "Member"
      : null,
  }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .order("category")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const safe = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    url: row.is_private || row.storage_path ? null : row.url,
  }));

  const enriched = await attachUploaderNames(supabase, safe);
  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, category, storagePath, url, fileSizeBytes, mimeType, isPrivate, folderId } = body;
  if (!orgId || !title) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }
  if (!storagePath && !url) {
    return NextResponse.json({ error: "Upload a file or provide a link before saving" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, String(orgId));
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolvedUrl = url ?? (storagePath ? `storage:${storagePath}` : null);

  const { data, error } = await supabase.from("documents").insert({
    org_id: orgId,
    uploaded_by: user.id,
    title,
    category: category ?? "General",
    storage_path: storagePath ?? resolvedUrl,
    url: resolvedUrl,
    folder_id: folderId ?? null,
    file_size_bytes: fileSizeBytes ?? null,
    mime_type: mimeType ?? null,
    is_private: isPrivate ?? false,
  }).select().single();

  if (error) {
    const friendly = error.message.includes("null value")
      ? "Could not save — make sure the file finished uploading"
      : "Could not save this document. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "document_uploaded",
    resource_type: "documents",
    resource_id: data.id,
    metadata: { title, category },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ...data,
    uploaded_by_name: profile?.full_name ?? "You",
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, folderId } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, String(orgId));
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("documents")
    .update({ folder_id: folderId ?? null })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const storagePath = searchParams.get("storage_path");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (storagePath) {
    await supabase.storage.from("documents").remove([storagePath]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
