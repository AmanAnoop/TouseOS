"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calculator, Calendar, Car, Hotel, Plane, Plus, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Input,
  Modal, PageHeader, StatCard, Tabs,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SportsTravelTrip } from "@/types";

const COST_CATEGORIES = [
  { key: "gas", label: "Gas", icon: <Car size={14} /> },
  { key: "flights", label: "Flights", icon: <Plane size={14} /> },
  { key: "hotels", label: "Hotels", icon: <Hotel size={14} /> },
  { key: "rental_vans", label: "Rental vans", icon: <Car size={14} /> },
  { key: "buses", label: "Buses", icon: <Car size={14} /> },
  { key: "tournament_registration", label: "Tournament reg.", icon: <Calendar size={14} /> },
  { key: "referee_fees", label: "Referee fees", icon: <Users size={14} /> },
  { key: "food", label: "Food", icon: "🍕" },
  { key: "equipment_transport", label: "Equipment transport", icon: "📦" },
  { key: "uniforms", label: "Uniforms", icon: "👕" },
  { key: "emergency_reserve", label: "Emergency reserve", icon: "🚑" },
];

export default function TravelPage() {
  const supabase = createClient();
  const [trips, setTrips] = useState<SportsTravelTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("trips");
  const [createOpen, setCreateOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(20);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [subsidy, setSubsidy] = useState(0);

  const [form, setForm] = useState({
    title: "", destination: "", departureDate: "",
    returnDate: "", itinerary: "", packingList: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase.from("sports_travel_trips").select("*").eq("org_id", oid).order("departure_date");
    setTrips((data ?? []) as SportsTravelTrip[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  async function createTrip() {
    if (!orgId || !form.title || !form.departureDate) return;
    const { error } = await supabase.from("sports_travel_trips").insert({
      org_id: orgId,
      title: form.title,
      destination: form.destination || null,
      departure_date: form.departureDate,
      return_date: form.returnDate || form.departureDate,
      itinerary: form.itinerary || null,
      status: "planning",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Trip created!");
    setCreateOpen(false);
    setForm({ title: "", destination: "", departureDate: "", returnDate: "", itinerary: "", packingList: "" });
    load(orgId);
  }

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);
  const netCost = totalCost - subsidy;
  const perPlayer = playerCount > 0 ? netCost / playerCount : 0;

  const upcoming = trips.filter((t) => new Date(t.departure_date) >= new Date());
  const past = trips.filter((t) => new Date(t.departure_date) < new Date());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Travel Management"
        description={`${upcoming.length} upcoming trips`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Calculator size={14} />} onClick={() => setCalcOpen(true)}>Trip calculator</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New trip</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Upcoming trips" value={upcoming.length} icon={<Calendar size={18} />} />
        <StatCard title="Past trips" value={past.length} icon={<Calendar size={18} />} />
        <StatCard title="Total cost tracked" value={trips.reduce((s, t) => s + Number(t.total_cost ?? 0), 0) > 0 ? formatCurrency(trips.reduce((s, t) => s + Number(t.total_cost ?? 0), 0)) : "—"} icon={<Calculator size={18} />} />
        <StatCard title="Avg cost/player" value={trips.reduce((s, t) => s + Number(t.cost_per_player ?? 0), 0) > 0 ? formatCurrency(trips.reduce((s, t) => s + Number(t.cost_per_player ?? 0), 0) / trips.filter((t) => t.cost_per_player).length) : "—"} icon={<Users size={18} />} />
      </div>

      <Tabs tabs={[{ id: "trips", label: "Upcoming", count: upcoming.length }, { id: "past", label: "Past", count: past.length }]} active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-3">{[1,2].map((i) => <Card key={i} className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : (tab === "trips" ? upcoming : past).length === 0 ? (
        <EmptyState icon={<Calendar size={24} />} title={tab === "trips" ? "No upcoming trips" : "No past trips"} action={tab === "trips" ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Plan trip</Button> : undefined} />
      ) : (
        <div className="space-y-4">
          {(tab === "trips" ? upcoming : past).map((trip) => (
            <Card key={trip.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground">{trip.title}</h3>
                    <Badge label={trip.status} color={trip.status === "confirmed" ? "green" : trip.status === "planning" ? "yellow" : "blue"} />
                  </div>
                  {trip.destination && (
                    <p className="text-sm text-muted-foreground mt-0.5">📍 {trip.destination}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatDate(trip.departure_date)} – {formatDate(trip.return_date)}
                  </p>
                </div>
                <div className="text-right">
                  {trip.total_cost && <p className="font-bold text-foreground">{formatCurrency(Number(trip.total_cost))}</p>}
                  {trip.cost_per_player && <p className="text-xs text-muted-foreground">{formatCurrency(Number(trip.cost_per_player))}/player</p>}
                </div>
              </div>

              {/* Travel readiness checks */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Readiness checklist</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Waivers", icon: "📋", ok: true },
                    { label: "Payments", icon: "💳", ok: false },
                    { label: "Hotels", icon: "🏨", ok: true },
                    { label: "Drivers", icon: "🚗", ok: false },
                    { label: "Emergency contacts", icon: "📞", ok: true },
                    { label: "Itinerary", icon: "🗺️", ok: Boolean(trip.itinerary) },
                    { label: "Roster confirmed", icon: "✅", ok: false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 p-2 rounded-lg text-xs ${item.ok ? "bg-green-50 dark:bg-green-950/20 text-green-700" : "bg-red-50 dark:bg-red-950/20 text-red-600"}`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                      <span className="ml-auto font-bold">{item.ok ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create trip modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Plan a trip" size="md"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createTrip} disabled={!form.title || !form.departureDate}>Create trip</Button></>}
      >
        <div className="space-y-4">
          <Input label="Trip title *" placeholder="State Championships – Columbus" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Destination" placeholder="Columbus, OH" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Departure date *" type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
            <Input label="Return date" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Itinerary</label>
            <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Day 1: Depart 8am, hotel check-in 2pm..." value={form.itinerary} onChange={(e) => setForm({ ...form, itinerary: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Trip cost calculator */}
      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Trip cost calculator" size="lg"
        footer={<Button onClick={() => setCalcOpen(false)}>Done</Button>}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Number of players</label>
            <input type="number" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={playerCount} onChange={(e) => setPlayerCount(parseInt(e.target.value) || 0)} />
          </div>

          <div className="space-y-2">
            {COST_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="text-sm w-40 flex-shrink-0 flex items-center gap-2">
                  {typeof cat.icon === "string" ? cat.icon : cat.icon}
                  {cat.label}
                </span>
                <input type="number" className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0" value={costs[cat.key] || ""} onChange={(e) => setCosts({ ...costs, [cat.key]: parseFloat(e.target.value) || 0 })} />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Chapter subsidy ($)</label>
            <input type="number" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={subsidy} onChange={(e) => setSubsidy(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="p-4 rounded-xl bg-sports-50 dark:bg-sports-950/20 border border-sports-200 dark:border-sports-800 space-y-2">
            <div className="flex justify-between text-sm"><span>Total trip cost:</span><span className="font-bold">{formatCurrency(totalCost)}</span></div>
            <div className="flex justify-between text-sm"><span>Chapter subsidy:</span><span className="font-bold text-green-600">- {formatCurrency(subsidy)}</span></div>
            <div className="flex justify-between text-sm"><span>Net cost:</span><span className="font-bold">{formatCurrency(netCost)}</span></div>
            <div className="border-t border-sports-200 dark:border-sports-800 pt-2 flex justify-between"><span className="font-bold">Per player ({playerCount}):</span><span className="text-xl font-bold text-sports-700 dark:text-sports-400">{formatCurrency(perPlayer)}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
