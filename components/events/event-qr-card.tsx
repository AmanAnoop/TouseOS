"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardHeader } from "@/components/ui";

interface EventQrCardProps {
  eventId: string;
  eventTitle: string;
}

export function EventQrCard({ eventId, eventTitle }: EventQrCardProps) {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventId}`
    : `/events/${eventId}`;

  return (
    <Card>
      <CardHeader title="Event QR code" description="Scan for RSVP and check-in" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0 16px" }}>
        <QRCodeSVG value={url} size={160} level="M" includeMargin />
        <p className="type-small" style={{ color: "var(--color-text-muted)", margin: 0, textAlign: "center" }}>
          {eventTitle}
        </p>
        <p className="type-small" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0, wordBreak: "break-all" }}>
          {url}
        </p>
      </div>
    </Card>
  );
}
