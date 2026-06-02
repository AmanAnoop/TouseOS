import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatCard,
} from "@/components/ui";
import { Calendar, Plus, Trophy } from "lucide-react";
import { TournamentTools } from "@/components/tournaments/tournament-tools";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Tournament Management" };
export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("org_id", m.org_id)
    .in("type", ["tournament", "game", "tryout"])
    .order("starts_at");

  const eventList = (events ?? []) as Array<Record<string, unknown>>;

  const upcoming = eventList.filter((e) => new Date(String(e.starts_at)) >= new Date());
  const past = eventList.filter((e) => new Date(String(e.starts_at)) < new Date());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tournament & League Management"
        description="Schedules, results, brackets, and roster submissions"
        action={
          <Link href="/events/new">
            <Button size="sm" icon={<Plus size={14} />}>Add game/tournament</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Upcoming" value={upcoming.length} icon={<Trophy size={18} />} />
        <StatCard title="Games/tournaments" value={eventList.length} icon={<Calendar size={18} />} />
        <StatCard title="Past results" value={past.length} icon={<Trophy size={18} />} />
      </div>

      {eventList.length === 0 ? (
        <EmptyState
          icon={<Trophy size={24} />}
          title="No games or tournaments scheduled"
          description="Add your upcoming games, tournaments, and tryouts from the Events page."
          action={
            <Link href="/events/new">
              <Button size="sm" icon={<Plus size={14} />}>Add event</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <Card>
              <CardHeader title="Upcoming schedule" icon={<Calendar size={16} />} />
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <div key={String(e.id)} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${String(e.type) === "tournament" ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600" : "bg-sports-50 dark:bg-sports-950/30 text-sports-600"}`}>
                      <Trophy size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{String(e.title)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Calendar size={10} />
                        {formatDate(String(e.starts_at))}
                        {Boolean(e.location) && <span>· {String(e.location)}</span>}
                      </div>
                    </div>
                    <Badge label={String(e.type)} color={String(e.type) === "tournament" ? "purple" : "blue"} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {past.length > 0 && (
            <Card>
              <CardHeader title="Past results" icon={<Trophy size={16} />} />
              <div className="space-y-2">
                {past.map((e) => (
                  <div key={String(e.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-1 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                      <Trophy size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{String(e.title)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(String(e.starts_at))}</p>
                    </div>
                    <Badge label="Completed" color="green" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <TournamentTools />
        </div>
      )}
    </div>
  );
}
