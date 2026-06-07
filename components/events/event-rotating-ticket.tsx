"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Ticket } from "lucide-react";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export function EventRotatingTicket({ eventId }: { eventId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<{ message: string } | null>(null);
  const [memberName, setMemberName] = useState("");
  const [refreshMs, setRefreshMs] = useState(2000);

  const loadTicket = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/rotating-ticket`);
    const data = await res.json();
    if (data.revoked) {
      setRevoked({ message: data.message });
      setToken(null);
      return;
    }
    if (res.ok && data.token) {
      setRevoked(null);
      setToken(data.token);
      setMemberName(data.memberName ?? "");
      setRefreshMs(data.refreshMs ?? 2000);
    }
  }, [eventId]);

  useEffect(() => {
    loadTicket();
    const interval = setInterval(loadTicket, refreshMs);
    return () => clearInterval(interval);
  }, [loadTicket, refreshMs]);

  if (revoked) {
    return (
      <Card>
        <CardHeader title="Your ticket" icon={<Ticket size={16} />} />
        <EmptyState
          icon={<Ticket size={20} />}
          title="Ticket not available"
          description={revoked.message}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Your ticket"
        icon={<Ticket size={16} />}
        description="Show this at the door — it refreshes every few seconds"
      />
      <div className="flex flex-col items-center gap-3 py-2">
        {token ? (
          <>
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={token} size={180} level="M" includeMargin />
            </div>
            <p className="text-sm font-medium text-foreground">{memberName}</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Screenshots won&apos;t work — this code changes automatically.
            </p>
          </>
        ) : (
          <div className="h-48 w-48 rounded-xl bg-surface-2 animate-pulse" />
        )}
      </div>
    </Card>
  );
}
