import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import {
  Calendar, Clock, ExternalLink, MapPin, Music, QrCode, Share2, Users,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// Public event page — no auth required
export default async function PublicEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*, organizations(name, logo_url, primary_color)")
    .eq("id", id)
    .eq("is_private", false)
    .single();

  if (error || !event) notFound();

  const evt = event as Record<string, unknown>;
  const org = evt.organizations as Record<string, unknown>;

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("id, status, checked_in")
    .eq("event_id", id);

  const goingCount = (rsvps ?? []).filter((r: Record<string, unknown>) => r.status === "going").length;
  const isPast = new Date(String(evt.starts_at)) < new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative h-64 sm:h-80 bg-gradient-to-br from-greek-600 to-greek-800"
        style={evt.cover_image_url ? { backgroundImage: `url(${String(evt.cover_image_url)})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          {org && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(org.logo_url)} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/20" />
              )}
              <span className="text-white text-xs font-medium">{String(org.name)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30">
              <Share2 size={15} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge label={String(evt.type).replace(/_/g, " ")} color="blue" className="bg-white/20 text-white border-transparent" />
            {evt.theme && <Badge label={String(evt.theme)} color="purple" className="bg-white/20 text-white border-transparent" />}
            {evt.alcohol && <Badge label="21+" color="orange" className="bg-white/20 text-white border-transparent" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{String(evt.title)}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* RSVP CTA */}
        {Boolean(evt.rsvp_enabled) && !isPast && (
          <Link href={`/events/${id}`}>
            <button
              className="w-full py-3.5 rounded-xl font-semibold text-white text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: String(org?.primary_color ?? "#059669") }}
            >
              RSVP now
            </button>
          </Link>
        )}

        {/* Event details */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-1 border border-border flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{formatDateTime(String(evt.starts_at))}</p>
              {evt.ends_at && <p className="text-xs text-muted-foreground">Until {formatDateTime(String(evt.ends_at))}</p>}
            </div>
          </div>

          {evt.location && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-1 border border-border flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{String(evt.location)}</p>
                {evt.address && <p className="text-xs text-muted-foreground">{String(evt.address)}</p>}
              </div>
            </div>
          )}

          {evt.dress_code && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-1 border border-border flex items-center justify-center flex-shrink-0 text-base">👔</div>
              <div>
                <p className="text-xs text-muted-foreground">Dress code</p>
                <p className="text-sm font-medium text-foreground">{String(evt.dress_code)}</p>
              </div>
            </div>
          )}

          {evt.playlist_url && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-1 border border-border flex items-center justify-center flex-shrink-0">
                <Music size={16} className="text-muted-foreground" />
              </div>
              <a href={String(evt.playlist_url)} target="_blank" rel="noopener noreferrer" className="text-sm text-greek-600 hover:underline flex items-center gap-1">
                Event playlist <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Attendees */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={15} />
          <span>{goingCount} {goingCount === 1 ? "person" : "people"} going</span>
        </div>

        {/* Description */}
        {evt.description && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">About this event</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{String(evt.description)}</p>
          </div>
        )}

        {/* Share */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Hosted by <strong>{String(org?.name ?? "")}</strong> via TouseOS
          </p>
        </div>
      </div>
    </div>
  );
}
