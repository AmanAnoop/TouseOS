"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export interface EngagementMember {
  id: string;
  full_name: string;
  attended: number;
  total: number;
  rate: number;
}

export interface EngagementEvent {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  attendeeCount: number;
}

type EventFilter = "all" | "brotherhood" | "sisterhood" | "upcoming" | "past";

interface EngagementDashboardProps {
  members: EngagementMember[];
  events: EngagementEvent[];
  semesterGoal: number;
  orgLabel: string;
  orgType: string;
}

export function EngagementDashboard({
  members, events, semesterGoal, orgLabel, orgType,
}: EngagementDashboardProps) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const now = Date.now();

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const isPast = new Date(e.starts_at).getTime() < now;
      if (filter === "brotherhood") return e.type === "brotherhood";
      if (filter === "sisterhood") return e.type === "sisterhood";
      if (filter === "upcoming") return !isPast;
      if (filter === "past") return isPast;
      return true;
    });
  }, [events, filter, now]);

  const createHref = orgType === "sorority"
    ? "/events/new?type=sisterhood"
    : "/events/new?type=brotherhood";

  return (
    <div className="ds-page-stack">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={createHref}>
          <Button size="sm" variant="secondary">
            Create {orgLabel} event
          </Button>
        </Link>
        {orgType === "fraternity" && (
          <Link href="/events/new?type=brotherhood">
            <Button size="sm" variant="secondary">Create Brotherhood event</Button>
          </Link>
        )}
        {orgType === "sorority" && (
          <Link href="/events/new?type=sisterhood">
            <Button size="sm" variant="secondary">Create Sisterhood event</Button>
          </Link>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["all", "brotherhood", "sisterhood", "upcoming", "past"] as EventFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`ds-segment ${filter === f ? "ds-segment-active" : ""}`}
            style={{ flex: "0 1 auto", minWidth: 0, padding: "0 12px" }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="No engagement events yet"
          description="Create your first brotherhood or sisterhood event to get started."
          action={
            <Link href={createHref}>
              <Button size="sm">Create event</Button>
            </Link>
          }
        />
      ) : (
        <div className="ds-card" style={{ padding: 0, overflow: "hidden" }}>
          {filteredEvents.map((e) => (
            <div key={e.id} className="ds-feed-event-row">
              <Badge label={e.type.replace("_", " ")} color="purple" />
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.title}
              </span>
              <span className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                {formatDateTime(e.starts_at)}
              </span>
              <span className="type-small" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>
                {e.attendeeCount} RSVP
              </span>
              <Link href={`/events/${e.id}`}>
                <Button size="sm" variant="ghost">View</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="type-h3" style={{ marginBottom: 12 }}>Member participation</h3>
        <p className="type-small" style={{ color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Semester goal: {semesterGoal} {orgLabel.toLowerCase()} events · {members.filter((m) => m.attended >= semesterGoal).length}/{members.length} on track
        </p>
        {members.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="No members" />
        ) : (
          <div className="ds-card" style={{ padding: 0, overflow: "hidden" }}>
            {[...members].sort((a, b) => b.rate - a.rate).slice(0, 12).map((m) => (
              <div key={m.id} className="ds-feed-event-row">
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{m.full_name}</span>
                <span className="type-small" style={{ fontFamily: "var(--font-mono)" }}>
                  {m.attended}/{m.total}
                </span>
                <Badge label={m.attended >= semesterGoal ? "On track" : "Below goal"} color={m.attended >= semesterGoal ? "green" : "yellow"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
