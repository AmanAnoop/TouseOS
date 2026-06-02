"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, EmptyState, PageHeader,
  SearchInput, Skeleton, Tabs,
} from "@/components/ui";
import type { Event } from "@/types";
import { EventCard } from "@/components/events/event-card";
import { usePermissions } from "@/hooks/use-permissions";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "draft", label: "Drafts" },
];

export default function EventsPage() {
  const supabase = createClient();
  const { can, loading: permLoading } = usePermissions();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [query, setQuery] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!m) return;

    const now = new Date().toISOString();
    let q = supabase.from("events").select("*").eq("org_id", m.org_id);

    if (tab === "upcoming") q = q.gte("starts_at", now).eq("status", "upcoming").order("starts_at");
    else if (tab === "past") q = q.lt("starts_at", now).order("starts_at", { ascending: false });
    else q = q.eq("status", "draft").order("created_at", { ascending: false });

    const { data } = await q.limit(50);
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  }, [supabase, tab]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filtered = events.filter((e) =>
    !query ||
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    (e.location ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
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

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} padding="sm">
              <Skeleton className="h-32 w-full rounded-lg mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title={tab === "upcoming" ? "No upcoming events" : "No events found"}
          description={tab === "upcoming" ? "Create your first event." : undefined}
          action={
            tab === "upcoming" ? (
              <Link href="/events/new">
                <Button size="sm" icon={<Plus size={14} />}>Create event</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
