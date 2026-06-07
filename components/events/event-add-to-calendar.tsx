"use client";

import { useState } from "react";
import { CalendarPlus, Download } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { googleCalendarUrl } from "@/lib/event-ics";

interface EventAddToCalendarProps {
  eventId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  startsAt: string;
  endsAt?: string | null;
}

export function EventAddToCalendar({
  eventId,
  title,
  description,
  location,
  address,
  startsAt,
  endsAt,
}: EventAddToCalendarProps) {
  const [downloading, setDownloading] = useState(false);

  const googleUrl = googleCalendarUrl({
    id: eventId,
    title,
    description,
    location,
    address,
    startsAt,
    endsAt,
  });

  async function downloadIcs() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/calendar`);
      if (!res.ok) {
        toast.error("Could not download calendar file — try again in a moment");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Calendar file saved — open it to add to your phone");
    } catch {
      toast.error("Something went wrong — try again");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={<Download size={14} />}
        loading={downloading}
        onClick={downloadIcs}
      >
        Add to my calendar
      </Button>
      <a href={googleUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" icon={<CalendarPlus size={14} />}>
          Google Calendar
        </Button>
      </a>
      <Button
        variant="outline"
        size="sm"
        icon={<CalendarPlus size={14} />}
        onClick={downloadIcs}
      >
        Apple Calendar
      </Button>
    </div>
  );
}
