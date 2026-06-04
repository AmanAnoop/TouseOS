import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type RoleName } from "@/lib/permissions";

/** Extract storage object path from a Supabase public/signed receipts URL. */
export function receiptStoragePathFromUrl(receiptUrl: string): string | null {
  try {
    const u = new URL(receiptUrl);
    const marker = "/receipts/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export function canViewReimbursementReceipt(role: RoleName): boolean {
  return can(role, "view_payments") || can(role, "manage_budget");
}

export async function createReceiptSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create receipt link" };
  }
  return { url: data.signedUrl };
}
