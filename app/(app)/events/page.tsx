"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, PageHeader,
  SearchInput, Skeleton, Tabs,
} from "@/components/ui";
import { formatDateTime, formatDate, getStatusColor } from "@/lib/utils";
import type { Event } from "@/types";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "draft", label: "Drafts" },
];

const TYPE_COLORS: Record<string, string> = {
  mixer: "blue",
  formal: "purple",
  philanthropy: "green",
  recruitment: "yellow",
  practice: "blue",
  game: "green",
  tournament: "purple",
  tryout: "orange",
};

export default function EventsPage() {
  const supabase = createClient();
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
          <Link href="/events/new">
            <Button size="sm" icon={<Plus size={14} />}>New event</Button>
          </Link>
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
            <Link key={e.id} href={`/events/${e.id}`}>
              <Card padding="none" className="overflow-hidden hover:border-greek-300 transition-colors cursor-pointer">
                {/* Cover image */}
                <div
                  className="h-36 bg-gradient-to-br from-greek-500 to-greek-700 relative"
                  style={e.cover_image_url ? { backgroundImage: `url(${e.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                >
                  <div className="absolute top-2 right-2">
                    <Badge
                      label={e.type.replace(/_/g, " ")}
                      color={(TYPE_COLORS[e.type] ?? "gray") as "blue"}
                      className="text-xs"
                    />
                  </div>
                  {e.status === "draft" && (
                    <div className="absolute top-2 left-2">
                      <Badge label="Draft" color="yellow" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-foreground truncate">{e.title}</h3>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{formatDateTime(e.starts_at)}</span>
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin size={12} />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {e.rsvp_enabled && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users size={12} />
                        RSVP open
                      </div>
                    )}
                    {e.risk_level === "high" && <Badge label="High risk" color="red" />}
                    {e.alcohol && <Badge label="21+" color="orange" />}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
