/** Build a downloadable .ics calendar file for an event. */

export interface IcsEventInput {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  startsAt: string;
  endsAt?: string | null;
  orgName?: string | null;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildEventIcs(event: IcsEventInput): string {
  const uid = `${event.id}@touseos`;
  const dtStart = formatIcsDate(event.startsAt);
  const dtEnd = formatIcsDate(
    event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
  );
  const location = [event.location, event.address].filter(Boolean).join(", ");
  const description = [event.description, event.orgName ? `Hosted by ${event.orgName}` : null]
    .filter(Boolean)
    .join("\\n\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TouseOS//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];

  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(event: IcsEventInput): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });

  const location = [event.location, event.address].filter(Boolean).join(", ");
  if (location) params.set("location", location);
  if (event.description) params.set("details", event.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
