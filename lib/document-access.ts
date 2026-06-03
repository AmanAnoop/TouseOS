import type { SupabaseClient } from "@supabase/supabase-js";
import { isDashboardOfficer } from "@/lib/dashboard-roles";
import { can, type RoleName } from "@/lib/permissions";

export function canViewDocument(
  role: RoleName,
  isPrivate: boolean,
): boolean {
  if (!can(role, "view_documents")) return false;
  if (!isPrivate) return true;
  return isDashboardOfficer(role) || can(role, "manage_documents");
}

/** Signed download URL for org documents bucket (1 hour). */
export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create download link" };
  }
  return { url: data.signedUrl };
}
