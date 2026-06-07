"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function SelfCheckInPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing check-in code. Scan the QR code at the event.");
      return;
    }

    (async () => {
      const res = await fetch(`/api/events/${eventId}/self-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage(data.message ?? "You're checked in!");
      } else {
        setStatus("error");
        setMessage(data.message ?? "Could not check you in.");
      }
    })();
  }, [eventId, token]);

  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-4">
      <Link href={`/events/${eventId}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft size={16} />
        Back to event
      </Link>

      <Card padding="lg" className="text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-full bg-surface-2 animate-pulse mx-auto" />
            <p className="text-muted-foreground">Checking you in…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={48} className="text-green-600 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">You&apos;re in!</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link href={`/events/${eventId}`}>
              <Button variant="secondary">View event</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Couldn&apos;t check in</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link href={`/events/${eventId}`}>
              <Button variant="secondary">Back to event</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
