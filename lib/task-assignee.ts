import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedAssignee {
  userId: string | null;
  memberId: string | null;
  assigneeName: string;
}

/** Resolve assignee_name to member user_id for RLS and notifications. */
export async function resolveAssigneeUserId(
  supabase: SupabaseClient,
  orgId: string,
  assigneeName: string | null | undefined,
): Promise<string | null> {
  const one = await resolveAssignees(supabase, orgId, assigneeName ? [assigneeName] : []);
  return one[0]?.userId ?? null;
}

/** Resolve one or more assignee names to member rows. */
export async function resolveAssignees(
  supabase: SupabaseClient,
  orgId: string,
  names: string[],
): Promise<ResolvedAssignee[]> {
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  if (!trimmed.length) return [];

  const { data: members } = await supabase
    .from("member_profiles")
    .select("id, user_id, full_name, preferred_name")
    .eq("org_id", orgId)
    .not("user_id", "is", null);

  const results: ResolvedAssignee[] = [];
  for (const name of trimmed) {
    const lower = name.toLowerCase();
    const match = (members ?? []).find((m) => {
      const full = String(m.full_name ?? "").toLowerCase();
      const pref = String(m.preferred_name ?? "").toLowerCase();
      return full === lower || pref === lower || full.startsWith(lower) || lower.startsWith(full.split(" ")[0] ?? "");
    });
    results.push({
      userId: match?.user_id ? String(match.user_id) : null,
      memberId: match?.id ? String(match.id) : null,
      assigneeName: match ? String(match.full_name ?? name) : name,
    });
  }
  return results;
}

export async function syncTaskAssignees(
  supabase: SupabaseClient,
  taskId: string,
  assignees: ResolvedAssignee[],
) {
  await supabase.from("task_assignees").delete().eq("task_id", taskId);

  const rows = assignees
    .filter((a) => a.userId)
    .map((a) => ({
      task_id: taskId,
      user_id: a.userId!,
      member_id: a.memberId,
      assignee_name: a.assigneeName,
    }));

  if (rows.length) {
    await supabase.from("task_assignees").insert(rows);
  }

  const primary = assignees[0];
  if (primary) {
    await supabase.from("tasks").update({
      assignee_name: assignees.length > 1
        ? `${primary.assigneeName} +${assignees.length - 1} more`
        : primary.assigneeName,
      assigned_to: primary.userId,
    }).eq("id", taskId);
  }
}
