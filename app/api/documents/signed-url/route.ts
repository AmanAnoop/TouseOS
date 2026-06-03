import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole, forbidUnless } from "@/lib/api-org-role";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, org_id, storage_path, title, is_private")
    .eq("id", id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const role = await getMemberRole(supabase, user.id, doc.org_id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (doc.is_private) {
    const denied = forbidUnless(role, "manage_documents");
    if (denied) return denied;
  }

  if (!doc.storage_path) {
    return NextResponse.json({ error: "No file attached" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 3600);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: signError?.message ?? "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    title: doc.title,
    expiresIn: 3600,
  });
}
