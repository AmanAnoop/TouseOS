import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingColumnError(message: string, columns: readonly string[]): boolean {
  return columns.some((col) => message.includes(col));
}

function stripColumns(payload: Record<string, unknown>, columns: readonly string[]): Record<string, unknown> {
  const next = { ...payload };
  for (const key of columns) {
    delete next[key];
  }
  return next;
}

export async function insertRowWithOptionalColumns(
  supabase: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
  optionalColumns: readonly string[],
) {
  let result = await supabase.from(table).insert(payload).select().single();
  if (result.error && isMissingColumnError(result.error.message, optionalColumns)) {
    result = await supabase
      .from(table)
      .insert(stripColumns(payload, optionalColumns))
      .select()
      .single();
  }
  return result;
}

export const PHOTO_ALBUM_OPTIONAL_COLUMNS = ["created_by"] as const;

export const GOVERNANCE_MEETING_OPTIONAL_COLUMNS = [
  "attendee_ids",
  "expected_attendee_group",
] as const;
