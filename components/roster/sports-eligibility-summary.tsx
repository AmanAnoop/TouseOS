"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { assessMemberEligibility, eligibilityIssueLabel } from "@/lib/sports-eligibility";
import { isSportsOrg } from "@/lib/utils";

export function SportsEligibilitySummary({ orgId }: { orgId: string }) {
  const [summary, setSummary] = useState<{ eligible: number; blocked: number; topIssues: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: org } = await supabase.from("organizations").select("type").eq("id", orgId).single();
      if (!org || !isSportsOrg(String(org.type))) return;

      const [membersRes, waiversRes] = await Promise.all([
        supabase.from("member_profiles").select("id, membership_status, payment_status, attendance_rate, is_injured").eq("org_id", orgId).eq("membership_status", "active"),
        supabase.from("sports_waivers").select("member_id, waiver_type, status").eq("org_id", orgId).eq("status", "completed"),
      ]);

      const waiversByMember = new Map<string, string[]>();
      for (const w of waiversRes.data ?? []) {
        const mid = String(w.member_id);
        if (!waiversByMember.has(mid)) waiversByMember.set(mid, []);
        waiversByMember.get(mid)!.push(String(w.waiver_type));
      }

      let eligible = 0;
      let blocked = 0;
      const issueCounts = new Map<string, number>();

      for (const m of membersRes.data ?? []) {
        const { eligible: ok, issues } = assessMemberEligibility({
          membershipStatus: String(m.membership_status),
          paymentStatus: String(m.payment_status),
          attendanceRate: Number(m.attendance_rate ?? 0),
          isInjured: Boolean(m.is_injured),
          completedWaiverTypes: waiversByMember.get(String(m.id)) ?? [],
        });
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
      <p className="text-xs font-semibold text-sports-700 dark:text-sports-400 uppercase mb-2">SportsOS travel eligibility</p>
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
