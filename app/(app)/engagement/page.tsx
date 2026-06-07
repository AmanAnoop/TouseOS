"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/hooks/use-org";
import { PageHeader } from "@/components/ui";
import { EngagementDashboard, type EngagementMember, type EngagementEvent } from "@/components/engagement/engagement-dashboard";
import { isGreekOrg } from "@/lib/utils";

const BONDING_TYPES = ["brotherhood", "sisterhood"];
const SEMESTER_GOAL = 4;

export default function EngagementPage() {
  const { orgId, orgType } = useOrg();
  const [members, setMembers] = useState<EngagementMember[]>([]);
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const orgLabel = orgType === "sorority" ? "Sisterhood" : "Brotherhood";

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const semesterStart = new Date();
    semesterStart.setMonth(semesterStart.getMonth() - 4);

    const [membersRes, eventsRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=roster`),
      fetch(`/api/events?org_id=${encodeURIComponent(oid)}`),
    ]);

    const allMembers = membersRes.ok ? ((await membersRes.json()) as Array<{ id: string; full_name: string; membership_status: string }>) : [];
    const memberList = allMembers
      .filter((m) => m.membership_status === "active")
      .map((m) => ({ id: m.id, full_name: m.full_name }));
    const allEvents = eventsRes.ok ? ((await eventsRes.json()) as Array<{ id: string; title: string; type: string; starts_at: string }>) : [];
    const eventList = allEvents
      .filter((e) => BONDING_TYPES.includes(e.type) && new Date(e.starts_at) >= semesterStart)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const eventIds = eventList.map((e) => e.id);

    let rsvps: Array<{ member_id: string | null; event_id: string; checked_in: boolean }> = [];
    if (eventIds.length > 0) {
      const rsvpRes = await fetch(
        `/api/events/rsvps?org_id=${encodeURIComponent(oid)}&event_ids=${eventIds.join(",")}&checked_in=true`,
      );
      if (rsvpRes.ok) {
        const payload = await rsvpRes.json();
        rsvps = (payload.rsvps ?? []) as typeof rsvps;
      }
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

    let counts: Record<string, { going: number }> = {};
    if (eventIds.length > 0) {
      const countRes = await fetch(
        `/api/events/rsvps?org_id=${encodeURIComponent(oid)}&event_ids=${eventIds.join(",")}`,
      );
      if (countRes.ok) {
        const payload = await countRes.json();
        counts = payload.counts ?? {};
      }
    }
    const engagementEvents: EngagementEvent[] = eventList.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      starts_at: e.starts_at,
      attendeeCount: counts[e.id]?.going ?? 0,
    }));

    setMembers(engagementMembers);
    setEvents(engagementEvents);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    if (isGreekOrg(orgType)) load(orgId);
    else setLoading(false);
  }, [orgId, orgType, load]);

  if (!loading && orgType && !isGreekOrg(orgType)) {
    return (
      <div className="ds-page-stack">
        <PageHeader title="Brotherhood & Sisterhood Engagement" description="Greek chapter feature" />
        <p className="text-sm text-muted-foreground">Engagement tracking is available for fraternity and sorority organizations.</p>
      </div>
    );
  }

  return (
    <div className="ds-page-stack">
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
          orgType={orgType ?? "fraternity"}
        />
      )}
    </div>
  );
}
