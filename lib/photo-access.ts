import type { SupabaseClient } from "@supabase/supabase-js";

const PHOTO_BUCKET = "photos";
const DEFAULT_TTL = 3600;

/** Resolve display URL for a photo row (private bucket uses signed URL). */
export async function photoDisplayUrl(
  supabase: SupabaseClient,
  row: { url?: string | null; storage_path?: string | null },
  expiresIn = DEFAULT_TTL,
): Promise<string | null> {
  const path = row.storage_path?.trim();
  if (path) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return row.url?.trim() || null;
}

/** Attach `display_url` to each photo-like row for UI. */
export async function attachPhotoDisplayUrls<T extends { url?: string | null; storage_path?: string | null }>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<Array<T & { display_url: string | null }>> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      display_url: await photoDisplayUrl(supabase, row),
    })),
  );
}
