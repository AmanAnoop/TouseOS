"use client";

import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Event } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  mixer: "blue",
  formal: "purple",
  philanthropy: "green",
  recruitment: "yellow",
  practice: "blue",
  game: "green",
  tournament: "purple",
  tryout: "orange",
  brotherhood: "purple",
  sisterhood: "purple",
};

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card padding="none" className="overflow-hidden hover:border-greek-300 transition-colors cursor-pointer h-full">
        <div
          className="h-36 bg-gradient-to-br from-greek-500 to-greek-700 relative"
          style={event.cover_image_url ? {
            backgroundImage: `url(${event.cover_image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}}
        >
          <div className="absolute top-2 right-2">
            <Badge
              label={event.type.replace(/_/g, " ")}
              color={(TYPE_COLORS[event.type] ?? "gray") as "blue"}
              className="text-xs"
            />
          </div>
          {event.status === "draft" && (
            <div className="absolute top-2 left-2">
              <Badge label="Draft" color="yellow" />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} />
              <span>{formatDateTime(event.starts_at)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin size={12} />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {event.rsvp_enabled && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users size={12} />
                RSVP open
              </div>
            )}
            {event.risk_level === "high" && <Badge label="High risk" color="red" />}
            {event.alcohol && <Badge label="21+" color="orange" />}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export { TYPE_COLORS };
