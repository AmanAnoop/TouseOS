import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: documentId } = await params;
  const { orgId, storagePath, fileSizeBytes, mimeType } = await request.json();
  if (!orgId || !storagePath) {
    return NextResponse.json({ error: "orgId and storagePath required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_documents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const currentVersion = Number((doc as { version?: number }).version ?? 1);
  const nextVersion = currentVersion + 1;

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);

  await supabase.from("document_versions").insert({
    document_id: documentId,
    version: currentVersion,
    storage_path: doc.storage_path,
    url: doc.url,
    uploaded_by: user.id,
  });

  const { data: updated, error: updateError } = await supabase
    .from("documents")
    .update({
      storage_path: storagePath,
      url: urlData.publicUrl,
      version: nextVersion,
      file_size_bytes: fileSizeBytes ?? null,
      mime_type: mimeType ?? null,
      uploaded_by: user.id,
    })
    .eq("id", documentId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "document_version_uploaded",
    resource_type: "documents",
    resource_id: documentId,
    metadata: { version: nextVersion },
  });

  return NextResponse.json(updated);
}
