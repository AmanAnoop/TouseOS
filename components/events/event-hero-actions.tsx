"use client";

import { QrCode, Share2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export function EventHeroActions({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  async function shareEvent() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `You're invited: ${eventTitle}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: eventTitle, text, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied to clipboard");
    } catch {
      toast.error("Could not copy link — try copying from the address bar");
    }
  }

  return (
    <div className="absolute top-4 right-4 flex gap-2">
      <Link
        href={`/events/${eventId}/checkin`}
        className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
        title="Check-in QR"
      >
        <QrCode size={15} />
      </Link>
      <button
        type="button"
        onClick={shareEvent}
        className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30"
        title="Share event"
        aria-label="Share event"
      >
        <Share2 size={15} />
      </button>
    </div>
  );
}
