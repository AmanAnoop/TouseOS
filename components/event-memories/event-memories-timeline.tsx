"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { EventRecapButton } from "@/components/event-memories/event-recap-button";
import { formatDate } from "@/lib/utils";
import { Calendar, Camera, Clock, Image as ImageIcon } from "lucide-react";

interface TimelineEvent {
  id: string;
  title: string;
  type: string;
  starts_at: string;
  cover_image_url?: string | null;
  album?: { id: string; cover_url?: string | null } | null;
}

export function EventMemoriesTimeline({
  orgId,
  events,
}: {
  orgId: string;
  events: TimelineEvent[];
}) {
  return (
    <div className="relative">
      <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="flex gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-border bg-card flex items-center justify-center hidden sm:flex z-10">
              <Calendar size={14} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground">{event.title}</h3>
                    <Badge label={event.type.replace(/_/g, " ")} color="blue" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Clock size={11} />
                    {formatDate(event.starts_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EventRecapButton orgId={orgId} eventId={event.id} eventTitle={event.title} />
                  {event.album && (
                    <Link href="/social" className="flex items-center gap-1 text-xs text-greek-600 hover:underline">
                      <ImageIcon size={12} aria-hidden />
                      Album
                    </Link>
                  )}
                </div>
              </div>
              {(event.cover_image_url || event.album?.cover_url) ? (
                <div className="rounded-xl overflow-hidden mb-3 bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(event.album?.cover_url ?? event.cover_image_url)}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 rounded-xl bg-gradient-to-br from-greek-100 to-greek-200 dark:from-greek-950/30 dark:to-greek-900/30 flex items-center justify-center mb-3">
                  <div className="text-center">
                    <Camera size={20} className="mx-auto text-greek-400 mb-1" />
                    <p className="text-xs text-greek-500">No photos yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
