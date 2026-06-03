import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { forbidUnless, getMemberRole } from "@/lib/api-org-role";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .order("category")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const canSeePrivate = forbidUnless(role, "manage_documents") === null;
  const visible = (data ?? []).filter((d) => !d.is_private || canSeePrivate);
  return NextResponse.json(visible);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, category, storagePath, url, fileSizeBytes, mimeType, isPrivate } = body;
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const denied = forbidUnless(role, "manage_documents");
  if (denied) return denied;

  const { data, error } = await supabase.from("documents").insert({
    org_id: orgId,
    uploaded_by: user.id,
    title,
    category: category ?? "General",
    storage_path: storagePath,
    url,
    file_size_bytes: fileSizeBytes ?? null,
    mime_type: mimeType ?? null,
    is_private: isPrivate ?? false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "document_uploaded",
    resource_type: "documents",
    resource_id: data.id,
    metadata: { title, category },
  });

  return NextResponse.json(data, { status: 201 });
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
