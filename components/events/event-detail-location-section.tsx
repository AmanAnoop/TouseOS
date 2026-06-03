"use client";

import { useRouter } from "next/navigation";
import { LocationDisplay } from "@/components/location/location-display";
import { EventEditPanel } from "@/components/events/event-edit-panel";

export function EventDetailLocationSection({
  orgId,
  event,
  canEdit,
}: {
  orgId: string;
  event: Record<string, unknown>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const hasLocation = Boolean(event.location || event.address);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Location</p>
        <EventEditPanel
          orgId={orgId}
          event={event}
          canEdit={canEdit}
          onSaved={() => router.refresh()}
        />
      </div>
      {hasLocation ? (
        <LocationDisplay
          venueName={String(event.location ?? "")}
          address={String(event.address ?? "")}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No location set yet.
          {canEdit && " Use Edit details to add a venue and address."}
        </p>
      )}
    </div>
  );
}
