import { NextResponse } from "next/server";
import { canViewDocument, createDocumentSignedUrl } from "@/lib/document-access";
import type { RoleName } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("document_id");
  const orgId = searchParams.get("org_id");
  if (!documentId || !orgId) {
    return NextResponse.json({ error: "document_id and org_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, org_id, storage_path, is_private, title")
    .eq("id", documentId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const role = String(membership.role ?? "general_member") as RoleName;
  if (!canViewDocument(role, Boolean(doc.is_private))) {
    return NextResponse.json({ error: "You do not have access to this document" }, { status: 403 });
  }

  if (!doc.storage_path) {
    return NextResponse.json({ error: "No file stored for this document" }, { status: 400 });
  }

  const signed = await createDocumentSignedUrl(supabase, doc.storage_path);
  if ("error" in signed) {
    return NextResponse.json({ error: signed.error }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.url,
    title: doc.title,
    expiresIn: 3600,
  });
}
