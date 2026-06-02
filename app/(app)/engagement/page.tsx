"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui";
import { EngagementDashboard, type EngagementMember, type EngagementEvent } from "@/components/engagement/engagement-dashboard";
import { isGreekOrg } from "@/lib/utils";

const BONDING_TYPES = ["brotherhood", "sisterhood"];
const SEMESTER_GOAL = 4;

export default function EngagementPage() {
  const supabase = createClient();
  const [orgType, setOrgType] = useState("");
  const [members, setMembers] = useState<EngagementMember[]>([]);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const orgLabel = orgType === "sorority" ? "Sisterhood" : "Brotherhood";

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const semesterStart = new Date();
    semesterStart.setMonth(semesterStart.getMonth() - 4);

    const [membersRes, eventsRes] = await Promise.all([
      supabase.from("member_profiles").select("id, full_name").eq("org_id", oid).eq("membership_status", "active").order("full_name"),
      supabase.from("events").select("id, title, type, starts_at").eq("org_id", oid).in("type", BONDING_TYPES).gte("starts_at", semesterStart.toISOString()).order("starts_at"),
    ]);

    const memberList = (membersRes.data ?? []) as Array<{ id: string; full_name: string }>;
    const eventList = (eventsRes.data ?? []) as Array<{ id: string; title: string; type: string; starts_at: string }>;
    const eventIds = eventList.map((e) => e.id);

    let rsvps: Array<{ member_id: string | null; event_id: string; checked_in: boolean }> = [];
    if (eventIds.length > 0) {
      const { data } = await supabase
        .from("event_rsvps")
        .select("member_id, event_id, checked_in")
        .in("event_id", eventIds)
        .eq("checked_in", true);
      rsvps = (data ?? []) as typeof rsvps;
    }

    const pastEvents = eventList.filter((e) => new Date(e.starts_at) < new Date());
    const totalPast = pastEvents.length;

    const engagementMembers: EngagementMember[] = memberList.map((m) => {
      const attended = rsvps.filter((r) => r.member_id === m.id).length;
      return {
        id: m.id,
        full_name: m.full_name,
        attended,
        total: totalPast,
        rate: totalPast > 0 ? Math.round((attended / totalPast) * 100) : 0,
      };
    });

    const engagementEvents: EngagementEvent[] = await Promise.all(
      eventList.map(async (e) => {
        const { count } = await supabase
          .from("event_rsvps")
          .select("id", { count: "exact", head: true })
          .eq("event_id", e.id)
          .eq("status", "going");
        return {
          id: e.id,
          title: e.title,
          type: e.type,
          starts_at: e.starts_at,
          attendeeCount: count ?? 0,
        };
      }),
    );

    setMembers(engagementMembers);
    setEvents(engagementEvents);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, organizations(type)")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
const type = String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "");
        setOrgType(type);
        if (isGreekOrg(type)) load(m.org_id);
        else setLoading(false);
      }
    }
    init();
  }, [supabase, load]);

  if (!loading && orgType && !isGreekOrg(orgType)) {
    return (
      <div className="space-y-5">
        <PageHeader title="Brotherhood & Sisterhood Engagement" description="Greek chapter feature" />
        <p className="text-sm text-muted-foreground">Engagement tracking is available for fraternity and sorority organizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${orgLabel} Engagement`}
        description="Track bonding event participation and semester goals"
      />
      {loading ? (
        <div className="h-48 rounded-xl bg-surface-2 animate-pulse" />
      ) : (
        <EngagementDashboard
          members={members}
          events={events}
          semesterGoal={SEMESTER_GOAL}
          orgLabel={orgLabel}
        />
      )}
    </div>
  );
}
