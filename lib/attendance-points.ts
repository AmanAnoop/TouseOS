import type { SupabaseClient } from "@supabase/supabase-js";

export interface PointRule {
  id?: string;
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

export const DEFAULT_ELIGIBILITY_MIN = 20;

export function slugifyEventType(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || `custom_${Date.now()}`;
}

export function normalizePointRule(input: Partial<PointRule>): PointRule | null {
  const label = String(input.label ?? "").trim();
  const event_type = String(input.event_type ?? "").trim() || (label ? slugifyEventType(label) : "");
  if (!event_type) return null;
  const points = Math.max(0, Math.min(100, parseInt(String(input.points ?? 0), 10) || 0));
  return {
    id: input.id,
    event_type,
    points,
    label: label || event_type.replace(/_/g, " "),
  };
}

export function mergeRulesWithCatalog(
  saved: PointRule[],
  catalog: Array<{ value: string; label: string }>,
): PointRule[] {
  const byType = new Map<string, PointRule>();
  for (const r of saved) byType.set(r.event_type, r);
  for (const item of catalog) {
    if (!byType.has(item.value)) {
      const def = DEFAULT_POINT_RULES.find((d) => d.event_type === item.value);
      byType.set(item.value, {
        event_type: item.value,
        points: def?.points ?? 0,
        label: item.label,
      });
    }
  }
  return Array.from(byType.values()).sort((a, b) =>
    (a.label ?? a.event_type).localeCompare(b.label ?? b.event_type),
  );
}

export async function getPointRules(
  supabase: SupabaseClient,
  orgId: string,
): Promise<PointRule[]> {
  const { data } = await supabase
    .from("attendance_point_rules")
    .select("id, event_type, points, label")
    .eq("org_id", orgId)
    .order("label", { ascending: true });

  if (!data?.length) return [];
  return data as PointRule[];
}

export async function getEligibilityMin(
  supabase: SupabaseClient,
  orgId: string,
): Promise<number> {
  const { data } = await supabase.from("organizations").select("settings").eq("id", orgId).single();
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const n = Number(settings.points_eligibility_min);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ELIGIBILITY_MIN;
}

export async function savePointRules(
  supabase: SupabaseClient,
  orgId: string,
  rules: PointRule[],
): Promise<{ rules: PointRule[]; error?: string }> {
  const normalized: PointRule[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rules.length; i++) {
    const row = normalizePointRule(rules[i]);
    if (!row) continue;
    if (seen.has(row.event_type)) {
      return { rules: [], error: `Duplicate event type: ${row.event_type}` };
    }
    seen.add(row.event_type);
    normalized.push(row);
  }

  const { data: existing } = await supabase
    .from("attendance_point_rules")
    .select("id, event_type")
    .eq("org_id", orgId);

  const keepTypes = new Set(normalized.map((r) => r.event_type));
  const toDelete = (existing ?? []).filter((e) => !keepTypes.has(String(e.event_type)));

  for (const row of toDelete) {
    await supabase.from("attendance_point_rules").delete().eq("id", row.id);
  }

  for (const row of normalized) {
    const { error } = await supabase.from("attendance_point_rules").upsert(
      {
        org_id: orgId,
        event_type: row.event_type,
        points: row.points,
        label: row.label,
      },
      { onConflict: "org_id,event_type" },
    );
    if (error) return { rules: [], error: error.message };
  }

  const saved = await getPointRules(supabase, orgId);
  return { rules: saved };
}

export async function saveEligibilityMin(
  supabase: SupabaseClient,
  orgId: string,
  min: number,
): Promise<{ error?: string }> {
  const value = Math.max(1, Math.min(500, Math.round(min)));
  const { data: org } = await supabase.from("organizations").select("settings").eq("id", orgId).single();
  const prev = (org?.settings ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("organizations")
    .update({ settings: { ...prev, points_eligibility_min: value } })
    .eq("id", orgId);
  if (error) return { error: error.message };
  return {};
}

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

export async function getPointsEligibilityMin(supabase: SupabaseClient, orgId: string): Promise<number> {
  const { data: org } = await supabase.from("organizations").select("settings").eq("id", orgId).single();
  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  return Number(settings.points_eligibility_min ?? DEFAULT_ELIGIBILITY_MIN);
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
  const effective = rules.length ? rules : DEFAULT_POINT_RULES;
  const rule = effective.find((r) => r.event_type === eventType);
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
