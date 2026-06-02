"use client";

import { EventPhotoPromptsButton } from "@/components/events/event-photo-prompts-button";
import { EventRecapButton } from "@/components/event-memories/event-recap-button";

export function EventDetailActions({
  orgId,
  eventId,
  eventTitle,
  isPast,
}: {
  orgId: string;
  eventId: string;
  eventTitle: string;
  isPast: boolean;
}) {
  if (!isPast) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <EventPhotoPromptsButton orgId={orgId} eventId={eventId} eventTitle={eventTitle} />
      <EventRecapButton orgId={orgId} eventId={eventId} eventTitle={eventTitle} />
    </div>
  );
}
