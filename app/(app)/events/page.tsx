"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, CalendarDays, LayoutGrid, Plus, X } from "lucide-react";
import {
  Button, EmptyState, PageHeader,
  SearchInput, Skeleton,
} from "@/components/ui";
import type { Event } from "@/types";
import { EventCard } from "@/components/events/event-card";
import { EventsCalendarGrid } from "@/components/events/events-calendar-grid";
import { usePermissions } from "@/hooks/use-permissions";
import { useOrg } from "@/hooks/use-org";
import {
  getEventsViewPreference,
  setEventsViewPreference,
  type EventsViewMode,
} from "@/lib/events-view-preference";

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
  const [viewMode, setViewMode] = useState<EventsViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(getEventsViewPreference());
  }, []);

  function switchView(mode: EventsViewMode) {
    setViewMode(mode);
    setEventsViewPreference(mode);
    if (mode === "list") setSelectedDate(null);
  }

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

    setEvents(filteredByTab);
    setLoading(false);
  }, [orgId, tab]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = events.filter((e) => {
    const matchesQuery =
      !query ||
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      (e.location ?? "").toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (viewMode === "calendar" && selectedDate) {
      return e.starts_at.slice(0, 10) === selectedDate;
    }

    return true;
  });

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Events"
        description="Everything coming up — RSVP, check in, and stay in the loop"
        action={
          !permLoading && can("manage_events") ? (
            <Link href="/events/new">
              <Button size="sm" icon={<Plus size={14} />}>New event</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-surface-1 border border-border w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-surface-1 border border-border w-fit">
          <button
            type="button"
            onClick={() => switchView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid size={14} />
            List
          </button>
          <button
            type="button"
            onClick={() => switchView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays size={14} />
            Calendar
          </button>
        </div>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search events..."
      />

      {viewMode === "calendar" && !loading && !orgLoading && (
        <EventsCalendarGrid
          events={events}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {viewMode === "calendar" && selectedDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing events on{" "}
            <span className="font-medium text-foreground">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="inline-flex items-center gap-1 text-greek-600 hover:underline"
          >
            <X size={12} />
            Show all
          </button>
        </div>
      )}

      {(loading || orgLoading) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title={
            selectedDate
              ? "Nothing on this day"
              : tab === "upcoming"
                ? "No upcoming events"
                : tab === "past"
                  ? "No past events"
                  : "No drafts"
          }
          description={
            selectedDate
              ? "Pick another day on the calendar or clear the filter."
              : "Create an event to get started."
          }
          action={
            !permLoading && can("manage_events") && !selectedDate ? (
              <Link href="/events/new"><Button size="sm" icon={<Plus size={14} />}>New event</Button></Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 50).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
