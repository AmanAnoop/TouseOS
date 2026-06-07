"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

export function EventChapterQrCard({ eventId }: { eventId: string }) {
  const [checkInUrl, setCheckInUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [refreshMs, setRefreshMs] = useState(5 * 60 * 1000);

  const loadQr = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/chapter-qr`);
    if (!res.ok) return;
    const data = await res.json();
    setCheckInUrl(data.checkInUrl);
    setEventTitle(data.eventTitle ?? "");
    setRefreshMs(data.refreshMs ?? 5 * 60 * 1000);
  }, [eventId]);

  useEffect(() => {
    loadQr();
    const interval = setInterval(loadQr, refreshMs);
    return () => clearInterval(interval);
  }, [loadQr, refreshMs]);

  return (
    <Card>
      <CardHeader
        title="Chapter check-in QR"
        icon={<QrCode size={16} />}
        description="Display on a screen or print — members scan to check themselves in"
      />
      <div className="flex flex-col items-center gap-3 py-2">
        {checkInUrl ? (
          <>
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={checkInUrl} size={180} level="M" includeMargin />
            </div>
            <p className="text-xs text-muted-foreground text-center">{eventTitle}</p>
          </>
        ) : (
          <div className="h-48 w-48 rounded-xl bg-surface-2 animate-pulse" />
        )}
      </div>
    </Card>
  );
}
