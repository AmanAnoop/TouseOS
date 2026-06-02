import type { SupabaseClient } from "@supabase/supabase-js";

export interface PointRule {
  event_type: string;
  points: number;
  label: string | null;
}

export const DEFAULT_POINT_RULES: PointRule[] = [
  { event_type: "chapter_meeting", points: 2, label: "Chapter meeting" },
  { event_type: "philanthropy", points: 3, label: "Philanthropy event" },
  { event_type: "service", points: 3, label: "Service event" },
  { event_type: "brotherhood", points: 2, label: "Brotherhood/sisterhood" },
  { event_type: "sisterhood", points: 2, label: "Sisterhood event" },
  { event_type: "formal", points: 1, label: "Formal/social" },
];

export async function getPointRules(
  supabase: SupabaseClient,
  orgId: string,
): Promise<PointRule[]> {
  const { data } = await supabase
    .from("attendance_point_rules")
    .select("event_type, points, label")
    .eq("org_id", orgId);

  if (!data?.length) return DEFAULT_POINT_RULES;
  return data as PointRule[];
}

export async function awardCheckInPoints(params: {
  supabase: SupabaseClient;
  orgId: string;
  memberId: string;
  eventId: string;
  eventType: string;
  createdBy?: string;
}): Promise<{ awarded: boolean; points: number; reason?: string }> {
  const { supabase, orgId, memberId, eventId, eventType, createdBy } = params;

  const { data: existing } = await supabase
    .from("member_point_entries")
    .select("id")
    .eq("org_id", orgId)
    .eq("member_id", memberId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) return { awarded: false, points: 0, reason: "already_awarded" };

  const rules = await getPointRules(supabase, orgId);
  const rule = rules.find((r) => r.event_type === eventType);
  if (!rule || rule.points <= 0) return { awarded: false, points: 0, reason: "no_rule" };

  const { error } = await supabase.from("member_point_entries").insert({
    org_id: orgId,
    member_id: memberId,
    event_id: eventId,
    points: rule.points,
    reason: `Auto-award: ${rule.label ?? eventType} check-in`,
    entry_type: "earned",
    created_by: createdBy ?? null,
  });

  if (error) return { awarded: false, points: 0, reason: error.message };
  return { awarded: true, points: rule.points };
}
