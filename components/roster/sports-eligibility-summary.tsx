"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { assessMemberEligibility, eligibilityIssueLabel } from "@/lib/sports-eligibility";
import { getPointsEligibilityMin } from "@/lib/attendance-points";
import { isSportsOrg } from "@/lib/utils";

export function SportsEligibilitySummary({ orgId }: { orgId: string }) {
  const [summary, setSummary] = useState<{ eligible: number; blocked: number; topIssues: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: org } = await supabase.from("organizations").select("type").eq("id", orgId).single();
      if (!org || !isSportsOrg(String(org.type))) return;

      const [membersRes, waiversRes, pointsRes, pointsMin] = await Promise.all([
        supabase.from("member_profiles").select("id, membership_status, payment_status, attendance_rate, is_injured").eq("org_id", orgId).in("membership_status", ["active", "new_member"]),
        supabase.from("sports_waivers").select("member_id, waiver_type, status").eq("org_id", orgId).eq("status", "completed"),
        supabase.from("member_point_entries").select("member_id, points, entry_type").eq("org_id", orgId),
        getPointsEligibilityMin(supabase, orgId),
      ]);

      const pointsByMember = new Map<string, number>();
      for (const row of pointsRes.data ?? []) {
        const mid = String(row.member_id);
        const pts = Number(row.points ?? 0);
        const delta = row.entry_type === "deduction" ? -pts : pts;
        pointsByMember.set(mid, (pointsByMember.get(mid) ?? 0) + delta);
      }

      const waiversByMember = new Map<string, string[]>();
      for (const w of waiversRes.data ?? []) {
        const mid = String(w.member_id);
        if (!waiversByMember.has(mid)) waiversByMember.set(mid, []);
        waiversByMember.get(mid)!.push(String(w.waiver_type));
      }

      let eligible = 0;
      let blocked = 0;
      const issueCounts = new Map<string, number>();
      const requirePoints = pointsMin > 0;

      for (const m of membersRes.data ?? []) {
        const { eligible: ok, issues } = assessMemberEligibility({
          membershipStatus: String(m.membership_status),
          paymentStatus: String(m.payment_status),
          attendanceRate: Number(m.attendance_rate ?? 0),
          isInjured: Boolean(m.is_injured),
          completedWaiverTypes: waiversByMember.get(String(m.id)) ?? [],
          pointsTotal: pointsByMember.get(String(m.id)) ?? 0,
          pointsMin,
        }, { requirePoints });
        if (ok) eligible += 1;
        else {
          blocked += 1;
          for (const i of issues) issueCounts.set(i, (issueCounts.get(i) ?? 0) + 1);
        }
      }

      const topIssues = [...issueCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => eligibilityIssueLabel(k as never));

      setSummary({ eligible, blocked, topIssues });
    }
    load();
  }, [orgId]);

  if (!summary) return null;

  return (
    <Card padding="sm" className="border-sports-200 dark:border-sports-800 bg-sports-50/30 dark:bg-sports-950/20">
      <p className="type-label" style={{ marginBottom: 8 }}>Travel eligibility</p>
      <p className="text-sm">
        <strong>{summary.eligible}</strong> players travel-ready · <strong>{summary.blocked}</strong> need attention
      </p>
      {summary.topIssues.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">Top issues: {summary.topIssues.join(", ")}</p>
      )}
      <Link href="/travel" className="text-xs text-sports-600 hover:underline mt-2 inline-block">
        Manage travel →
      </Link>
    </Card>
  );
}
