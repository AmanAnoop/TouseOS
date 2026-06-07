import type { SupabaseClient } from "@supabase/supabase-js";

/** Total earned points for a member (all categories). */
export async function sumMemberPoints(
  supabase: SupabaseClient,
  orgId: string,
  memberId: string,
): Promise<number> {
  const { data } = await supabase
    .from("member_point_entries")
    .select("points, entry_type")
    .eq("org_id", orgId)
    .eq("member_id", memberId);

  return (data ?? []).reduce((sum, row) => {
    const pts = Number(row.points ?? 0);
    return sum + (row.entry_type === "deduction" ? -pts : pts);
  }, 0);
}

/** Points in one category (or all if category omitted). */
export async function sumMemberPointsInCategory(
  supabase: SupabaseClient,
  orgId: string,
  memberId: string,
  category?: string | null,
): Promise<number> {
  let query = supabase
    .from("member_point_entries")
    .select("points, entry_type, category")
    .eq("org_id", orgId)
    .eq("member_id", memberId);

  if (category?.trim()) {
    query = query.eq("category", category.trim());
  }

  const { data } = await query;

  return (data ?? []).reduce((sum, row) => {
    const pts = Number(row.points ?? 0);
    return sum + (row.entry_type === "deduction" ? -pts : pts);
  }, 0);
}

export interface PointGateResult {
  allowed: boolean;
  required: number;
  current: number;
  category: string | null;
  message?: string;
}

export async function checkEventPointGate(params: {
  supabase: SupabaseClient;
  orgId: string;
  memberId: string;
  pointGateMin: number | null | undefined;
  pointGateCategory: string | null | undefined;
}): Promise<PointGateResult> {
  const { supabase, orgId, memberId, pointGateMin, pointGateCategory } = params;
  const required = Number(pointGateMin ?? 0);

  if (!required || required <= 0) {
    return { allowed: true, required: 0, current: 0, category: pointGateCategory ?? null };
  }

  const current = await sumMemberPointsInCategory(
    supabase,
    orgId,
    memberId,
    pointGateCategory ?? null,
  );

  if (current >= required) {
    return { allowed: true, required, current, category: pointGateCategory ?? null };
  }

  const categoryLabel = pointGateCategory?.trim() || "chapter";
  const shortfall = required - current;

  return {
    allowed: false,
    required,
    current,
    category: pointGateCategory ?? null,
    message: `You need ${shortfall} more ${categoryLabel} point${shortfall === 1 ? "" : "s"} before this event (you have ${current} of ${required}).`,
  };
}
