import type { SupabaseClient } from "@supabase/supabase-js";

/** Columns added in migration 006 / 030 — may be missing on older DBs. */
export const OPTIONAL_TASK_COLUMNS = [
  "is_recurring",
  "recurrence_rule",
  "attachment_urls",
] as const;

function stripOptionalColumns(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  for (const key of OPTIONAL_TASK_COLUMNS) {
    delete next[key];
  }
  return next;
}

function isOptionalColumnError(message: string): boolean {
  return OPTIONAL_TASK_COLUMNS.some((col) => message.includes(col));
}

export async function insertTaskRow(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  let result = await supabase.from("tasks").insert(payload).select().single();
  if (result.error && isOptionalColumnError(result.error.message)) {
    result = await supabase.from("tasks").insert(stripOptionalColumns(payload)).select().single();
  }
  return result;
}

export async function updateTaskRow(
  supabase: SupabaseClient,
  taskId: string,
  updates: Record<string, unknown>,
) {
  let result = await supabase.from("tasks").update(updates).eq("id", taskId).select().single();
  if (result.error && isOptionalColumnError(result.error.message)) {
    result = await supabase
      .from("tasks")
      .update(stripOptionalColumns(updates))
      .eq("id", taskId)
      .select()
      .single();
  }
  return result;
}
