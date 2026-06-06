"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import {
  Button, EmptyState, PageHeader,
  SearchInput, Skeleton, Tabs,
} from "@/components/ui";
import type { Event } from "@/types";
import { EventCard } from "@/components/events/event-card";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "draft", label: "Drafts" },
];

export default function EventsPage() {
  const { orgId, loading: orgLoading } = useOrg();
  const { can, loading: permLoading } = usePermissions();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [query, setQuery] = useState("");

  const loadEvents = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await fetch(`/api/events?org_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const all = (await res.json()) as Event[];
    const now = new Date().toISOString();

    const filteredByTab = all.filter((e) => {
      if (tab === "draft") return e.status === "draft";
      if (tab === "past") return new Date(e.starts_at) < new Date(now);
      return e.status !== "draft" && new Date(e.starts_at) >= new Date(now);
    });

    filteredByTab.sort((a, b) => {
      const ta = new Date(a.starts_at).getTime();
      const tb = new Date(b.starts_at).getTime();
      return tab === "past" ? tb - ta : ta - tb;
    });

    setEvents(filteredByTab.slice(0, 50));
    setLoading(false);
  }, [orgId, tab]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = events.filter((e) =>
    !query ||
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    (e.location ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Events"
        description="Manage chapter events, RSVP, and check-in"
        action={
          !permLoading && can("manage_events") ? (
            <Link href="/events/new">
              <Button size="sm" icon={<Plus size={14} />}>New event</Button>
            </Link>
          ) : undefined
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search events..."
      />

      {(loading || orgLoading) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title={tab === "upcoming" ? "No upcoming events" : tab === "past" ? "No past events" : "No drafts"}
          description="Create an event to get started."
          action={
            !permLoading && can("manage_events") ? (
              <Link href="/events/new"><Button size="sm" icon={<Plus size={14} />}>New event</Button></Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
