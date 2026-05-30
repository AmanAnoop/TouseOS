import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ProgressBar, StatCard,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle, Calendar, CheckCircle2, DollarSign,
  Shield, Trophy, Users, Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "SportsOS Dashboard" };

export default async function SportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name, type)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!m) redirect("/onboarding");
  const orgId = m.org_id;

  const [membersRes, paymentsRes, waiversRes, tripsRes, injuriesRes, tryoutsRes, equipmentRes] = await Promise.all([
    supabase.from("member_profiles").select("id, full_name, membership_status, is_injured, payment_status").eq("org_id", orgId),
    supabase.from("payments").select("amount, paid_amount, status").eq("org_id", orgId),
    supabase.from("sports_waivers").select("id, status, waiver_type").eq("org_id", orgId),
    supabase.from("sports_travel_trips").select("id, title, destination, departure_date, status").eq("org_id", orgId).gte("departure_date", new Date().toISOString().split("T")[0]).order("departure_date").limit(3),
    supabase.from("sports_injuries").select("id, body_area, severity, is_cleared, member_profiles(full_name)").eq("org_id", orgId).eq("is_cleared", false),
    supabase.from("sports_tryouts").select("id, candidate_name, status, position").eq("org_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("sports_equipment").select("id, item_name, quantity_total, quantity_available").eq("org_id", orgId).limit(6),
  ]);

  const members = membersRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const waivers = waiversRes.data ?? [];
  const trips = tripsRes.data ?? [];
  const injuries = injuriesRes.data ?? [];
  const tryouts = tryoutsRes.data ?? [];
  const equipment = equipmentRes.data ?? [];

  const activePlayers = members.filter((m) => m.membership_status === "active");
  const injuredPlayers = members.filter((m) => m.is_injured);
  const totalExpected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.paid_amount), 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const completedWaivers = waivers.filter((w) => w.status === "completed").length;
  const missingWaivers = waivers.filter((w) => w.status === "missing").length;
  const waiverRate = waivers.length > 0 ? Math.round((completedWaivers / waivers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-sports-600 flex items-center justify-center">
              <Trophy size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-sports-600 uppercase tracking-wide">SportsOS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Team Dashboard</h1>
        </div>
        <Link href="/events/new">
          <Button size="sm" className="bg-sports-600 hover:bg-sports-700">
            <Calendar size={14} />
            Add event
          </Button>
        </Link>
      </div>

      {/* Alerts */}
      {(missingWaivers > 0 || injuredPlayers.length > 0) && (
        <div className="space-y-2">
          {missingWaivers > 0 && (
            <Alert type="warning" title={`${missingWaivers} waivers missing`} description={`${missingWaivers} players haven't completed required waivers.`} />
          )}
          {injuredPlayers.length > 0 && (
            <Alert type="error" title={`${injuredPlayers.length} player${injuredPlayers.length > 1 ? "s" : ""} on injury list`} />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Roster size" value={members.length} delta={`${activePlayers.length} active`} icon={<Users size={18} />} />
        <StatCard title="Dues collected" value={`${collectionRate}%`} delta={formatCurrency(totalCollected)} deltaType={collectionRate >= 75 ? "up" : "down"} icon={<DollarSign size={18} />} />
        <StatCard title="Waivers complete" value={`${waiverRate}%`} delta={`${missingWaivers} missing`} deltaType={missingWaivers === 0 ? "up" : "down"} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Injured players" value={injuredPlayers.length} deltaType={injuredPlayers.length > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Travel readiness */}
        <Card>
          <CardHeader title="Upcoming trips" icon={<Calendar size={16} />} action={<Link href="/travel" className="text-xs text-sports-600 hover:underline">View all</Link>} />
          {trips.length === 0 ? (
            <EmptyState icon={<Calendar size={20} />} title="No upcoming trips" action={<Link href="/travel/new" className="text-sm text-sports-600 hover:underline">Plan trip →</Link>} />
          ) : (
            <div className="space-y-3">
              {trips.map((trip: Record<string, unknown>) => (
                <Link key={String(trip.id)} href={`/travel/${trip.id}`} className="flex items-center gap-3 hover:bg-surface-1 p-2 rounded-lg -mx-2 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-sports-50 dark:bg-sports-950/30 flex items-center justify-center text-sports-600 flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{String(trip.title)}</p>
                    <p className="text-xs text-muted-foreground">{String(trip.destination ?? "—")} · {formatDate(String(trip.departure_date))}</p>
                  </div>
                  <Badge label={String(trip.status)} color={trip.status === "confirmed" ? "green" : "yellow"} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Waiver completion */}
        <Card>
          <CardHeader title="Waiver completion" icon={<Shield size={16} />} action={<Link href="/waivers" className="text-xs text-sports-600 hover:underline">Manage</Link>} />
          <div className="space-y-4">
            <ProgressBar value={waiverRate} label={`${completedWaivers}/${waivers.length} completed`} color={waiverRate === 100 ? "green" : waiverRate >= 75 ? "yellow" : "red"} size="md" />
            {["liability","concussion","emergency_contact","travel_authorization","code_of_conduct"].map((type) => {
              const completed = waivers.filter((w) => w.waiver_type === type && w.status === "completed").length;
              const total = members.length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground capitalize w-36 flex-shrink-0">{type.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-sports-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Injuries */}
        <Card>
          <CardHeader title="Active injuries" icon={<AlertTriangle size={16} />} action={<Link href="/injuries" className="text-xs text-sports-600 hover:underline">Manage</Link>} />
          {injuries.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={20} />} title="No active injuries" description="All players are cleared." />
          ) : (
            <div className="space-y-2">
              {injuries.map((inj: Record<string, unknown>) => (
                <div key={String(inj.id)} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{String((inj.member_profiles as Record<string, unknown>)?.full_name ?? "Player")}</p>
                    <p className="text-xs text-muted-foreground capitalize">{String(inj.body_area)} · {String(inj.severity)}</p>
                  </div>
                  <Badge label="Active" color="red" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tryout pipeline */}
        <Card>
          <CardHeader title="Recent tryouts" icon={<Trophy size={16} />} action={<Link href="/tryouts" className="text-xs text-sports-600 hover:underline">Manage</Link>} />
          {tryouts.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title="No tryout candidates" action={<Link href="/tryouts" className="text-sm text-sports-600 hover:underline">Set up tryouts →</Link>} />
          ) : (
            <div className="space-y-2">
              {tryouts.map((t: Record<string, unknown>) => (
                <div key={String(t.id)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-1 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-sports-100 dark:bg-sports-950/30 flex items-center justify-center text-sports-600 text-xs font-bold">
                    {String(t.candidate_name)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{String(t.candidate_name)}</p>
                    <p className="text-xs text-muted-foreground">{String(t.position ?? "—")}</p>
                  </div>
                  <Badge
                    label={String(t.status)}
                    color={String(t.status) === "accepted" ? "green" : String(t.status) === "cut" ? "red" : "yellow"}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Equipment */}
        <Card className="lg:col-span-2">
          <CardHeader title="Equipment inventory" icon={<Wrench size={16} />} action={<Link href="/equipment" className="text-xs text-sports-600 hover:underline">Full inventory</Link>} />
          {equipment.length === 0 ? (
            <EmptyState icon={<Wrench size={20} />} title="No equipment tracked" action={<Link href="/equipment" className="text-sm text-sports-600 hover:underline">Add inventory →</Link>} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {equipment.map((item: Record<string, unknown>) => {
                const available = Number(item.quantity_available);
                const total = Number(item.quantity_total);
                const pct = total > 0 ? Math.round((available / total) * 100) : 0;
                return (
                  <div key={String(item.id)} className="p-3 rounded-lg bg-surface-1 border border-border">
                    <p className="text-sm font-medium truncate">{String(item.item_name)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-sports-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{available}/{total}</span>
                    </div>
                    {available === 0 && <Badge label="Out of stock" color="red" className="mt-1" />}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
