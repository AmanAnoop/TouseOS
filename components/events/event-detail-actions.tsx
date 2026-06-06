"use client";

import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { EventPhotoPromptsButton } from "@/components/events/event-photo-prompts-button";
import { EventRecapButton } from "@/components/event-memories/event-recap-button";
import { Button } from "@/components/ui";

export function EventDetailActions({
  orgId,
  eventId,
  eventTitle,
  isPast,
  albumId,
}: {
  orgId: string;
  eventId: string;
  eventTitle: string;
  isPast: boolean;
  albumId?: string | null;
}) {
  if (!isPast) return null;

  const photosHref = albumId
    ? `/social?eventId=${eventId}&albumId=${albumId}`
    : `/social?eventId=${eventId}`;

  return (
    <div className="flex flex-wrap gap-2">
      <EventPhotoPromptsButton orgId={orgId} eventId={eventId} eventTitle={eventTitle} />
      <EventRecapButton orgId={orgId} eventId={eventId} eventTitle={eventTitle} />
      <Link href={photosHref}>
        <Button size="sm" variant="secondary" icon={<ImageIcon size={14} />}>
          View photos
        </Button>
      </Link>
    </div>
  );
}
