"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface FeedEvent {
  id: string;
  title: string;
  type?: string;
  starts_at: string;
  location?: string | null;
  address?: string | null;
}

export function FeedUpcomingEvents({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section style={{ marginTop: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 className="type-h3" style={{ margin: 0 }}>Upcoming events</h3>
        <Link href="/events">
          <Button size="sm" variant="ghost">View all</Button>
        </Link>
      </div>
      <div className="ds-card" style={{ padding: 0, overflow: "hidden" }}>
        {events.map((e) => {
          const location = e.location || e.address || "";
          return (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="ds-feed-event-row"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--color-org-primary)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.title}
                </span>
              </div>
              <span className="type-small" style={{ color: "var(--color-text-secondary)", flexShrink: 0, padding: "0 12px" }}>
                {formatDateTime(e.starts_at)}
              </span>
              <span
                className="type-small"
                style={{
                  color: "var(--color-text-secondary)",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                title={location}
              >
                {location || "—"}
              </span>
              <Button size="sm" variant="ghost" style={{ flexShrink: 0 }}>View</Button>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
