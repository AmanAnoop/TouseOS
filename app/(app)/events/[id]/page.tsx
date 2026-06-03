import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { Badge, Card, ProgressBar,
} from "@/components/ui";
import {
  Calendar, ChevronLeft, Clock, ExternalLink,
  Music, Users,
} from "lucide-react";
import { EventHeroActions } from "@/components/events/event-hero-actions";
import { EventDetailLocationSection } from "@/components/events/event-detail-location-section";
import { formatDateTime } from "@/lib/utils";
import { can } from "@/lib/permissions";
import EventRsvpButton from "./rsvp-button";
import { EventDetailActions } from "@/components/events/event-detail-actions";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [eventRes, rsvpRes] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("event_rsvps").select("id, status, member_id, guest_name, checked_in").eq("event_id", id),
  ]);

  if (eventRes.error || !eventRes.data) notFound();

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const event = eventRes.data as Record<string, unknown>;
  if (String(event.org_id) !== membership.orgId) notFound();
  const rsvps = rsvpRes.data ?? [];

  const goingCount = rsvps.filter((r: Record<string, unknown>) => r.status === "going").length;
  const notGoingCount = rsvps.filter((r: Record<string, unknown>) => r.status === "not_going").length;
  const maybeCount = rsvps.filter((r: Record<string, unknown>) => r.status === "maybe").length;
  const checkedInCount = rsvps.filter((r: Record<string, unknown>) => r.checked_in).length;
  const capacity = event.rsvp_limit as number | null;
  const fillPct = capacity ? Math.min(100, Math.round((goingCount / capacity) * 100)) : null;

  const isPast = new Date(String(event.starts_at)) < new Date();
  const isUpcoming = !isPast;
  const canEditEvent = can(membership.role, "manage_events");

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      {/* Back nav */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/events" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft size={16} />
          Events
        </Link>
      </div>

      {/* Cover image + title card (Partiful-style) */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-card-lg">
        {/* Hero */}
        <div
          className="relative h-56 sm:h-72 bg-gradient-to-br from-greek-600 to-greek-800"
          style={
            event.cover_image_url
              ? { backgroundImage: `url(${String(event.cover_image_url)})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          {/* Status badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {event.status === "draft" && <Badge label="Draft" color="yellow" />}
            {event.risk_level === "high" && !event.risk_approved && <Badge label="Needs approval" color="red" />}
            {Boolean(event.alcohol)&& <Badge label="21+" color="orange" />}
          </div>

          <EventHeroActions eventId={id} eventTitle={String(event.title)} />

          {/* Event title */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Badge label={String(event.type).replace(/_/g, " ")} color="blue" className="bg-white/20 text-white border-transparent" />
              {Boolean(event.theme)&& <Badge label={String(event.theme)} color="purple" className="bg-white/20 text-white border-transparent" />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {String(event.title)}
            </h1>
            <div className="flex items-center gap-1 mt-1 text-white/80 text-sm">
              <Calendar size={14} />
              <span>{formatDateTime(String(event.starts_at))}</span>
              {Boolean(event.ends_at)&& <span> – {formatDateTime(String(event.ends_at))}</span>}
            </div>
          </div>
        </div>

        {/* Event info body */}
        <div className="bg-card p-5 space-y-5">
          {/* RSVP action */}
          {Boolean(event.rsvp_enabled)&& isUpcoming && (
            <EventRsvpButton eventId={id} orgId={String(event.org_id)} capacity={capacity} goingCount={goingCount} />
          )}

          {/* Countdown */}
          {isUpcoming && (
            <div className="flex items-center justify-center gap-6 py-3 rounded-xl bg-greek-50 dark:bg-greek-950/30">
              <CountdownBlock event={event} />
            </div>
          )}

          {isPast && (
            <EventDetailActions
              orgId={String(event.org_id)}
              eventId={id}
              eventTitle={String(event.title)}
              isPast={isPast}
            />
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-surface-1">
              <p className="text-xl font-bold text-foreground">{goingCount}</p>
              <p className="text-xs text-muted-foreground">Going</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-surface-1">
              <p className="text-xl font-bold text-foreground">{maybeCount}</p>
              <p className="text-xs text-muted-foreground">Maybe</p>
            </div>
            {isPast ? (
              <div className="text-center p-3 rounded-xl bg-surface-1">
                <p className="text-xl font-bold text-foreground">{checkedInCount}</p>
                <p className="text-xs text-muted-foreground">Checked in</p>
              </div>
            ) : (
              <div className="text-center p-3 rounded-xl bg-surface-1">
                <p className="text-xl font-bold text-foreground">{notGoingCount}</p>
                <p className="text-xs text-muted-foreground">Not going</p>
              </div>
            )}
          </div>

          {/* Capacity bar */}
          {fillPct !== null && (
            <ProgressBar
              value={fillPct}
              label={`${goingCount}${capacity ? ` / ${capacity}` : ""} spots filled`}
              color={fillPct >= 90 ? "red" : fillPct >= 70 ? "yellow" : "green"}
              size="md"
            />
          )}

          {/* Details */}
          <div className="space-y-3">
            <EventDetailLocationSection
              orgId={String(event.org_id)}
              event={event}
              canEdit={canEditEvent}
            />

            {Boolean(event.starts_at)&& (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={15} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{formatDateTime(String(event.starts_at))}</p>
                  {Boolean(event.ends_at)&& (
                    <p className="text-xs text-muted-foreground">Until {formatDateTime(String(event.ends_at))}</p>
                  )}
                </div>
              </div>
            )}

            {Boolean(event.dress_code)&& (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-base">👔</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dress code</p>
                  <p className="text-sm font-medium text-foreground">{String(event.dress_code)}</p>
                </div>
              </div>
            )}

            {Boolean(event.playlist_url)&& (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center flex-shrink-0">
                  <Music size={15} className="text-muted-foreground" />
                </div>
                <a href={String(event.playlist_url)} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-greek-600 hover:underline flex items-center gap-1">
                  Event playlist
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {Boolean(event.description)&& (
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">About this event</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(event.description)}</p>
            </div>
          )}

          {/* Guest list */}
          {Boolean(event.show_guest_list)&& rsvps.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3 flex items-center gap-1">
                <Users size={13} />
                Guest list ({goingCount})
              </p>
              <div className="flex flex-wrap gap-2">
                {rsvps
                  .filter((r: Record<string, unknown>) => r.status === "going")
                  .slice(0, 12)
                  .map((r: Record<string, unknown>) => (
                    <div key={String(r.id)} className="w-9 h-9 rounded-full bg-greek-100 dark:bg-greek-950/40 flex items-center justify-center text-xs font-bold text-greek-700">
                      {String(r.guest_name ?? "?")[0]?.toUpperCase()}
                    </div>
                  ))}
                {goingCount > 12 && (
                  <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-xs text-muted-foreground">
                    +{goingCount - 12}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Check-in (for past events) */}
          {isPast && (
            <Card padding="sm" className="bg-surface-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attendance</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold">{checkedInCount}</p>
                  <p className="text-xs text-muted-foreground">Checked in</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{goingCount}</p>
                  <p className="text-xs text-muted-foreground">RSVPed</p>
                </div>
                {goingCount > 0 && (
                  <div className="flex-1">
                    <ProgressBar value={Math.round((checkedInCount / goingCount) * 100)} color="green" />
                    <p className="text-xs text-muted-foreground mt-1">{Math.round((checkedInCount / goingCount) * 100)}% attendance rate</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CountdownBlock({ event }: { event: Record<string, unknown> }) {
  const start = new Date(String(event.starts_at));
  const now = new Date();
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <>
      {days > 0 && <CountdownUnit value={days} label="days" />}
      {(days < 7) && <CountdownUnit value={hours} label="hrs" />}
      {days === 0 && <CountdownUnit value={mins} label="min" />}
    </>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-greek-700 dark:text-greek-400 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
