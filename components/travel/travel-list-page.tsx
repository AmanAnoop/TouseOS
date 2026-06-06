"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calculator, Calendar, Car, Hotel, MapPin, Plane, Plus, Users, Utensils, Package, Shirt,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, EmptyState, Input,
  Modal, PageHeader, Select, StatCard, Tabs,
} from "@/components/ui";
import { LocationFields, type LocationFieldValues } from "@/components/location/location-fields";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BUDGET_CATEGORIES, starterChecklist, travelProductFromOrgType, tripTypesForProduct,
} from "@/lib/travel-config";
import { useOrg } from "@/hooks/use-org";
import type { SportsTravelTrip } from "@/types";

const SPORTS_COST_CATEGORIES = [
  { key: "gas", label: "Gas", icon: <Car size={14} /> },
  { key: "flights", label: "Flights", icon: <Plane size={14} /> },
  { key: "hotels", label: "Hotels", icon: <Hotel size={14} /> },
  { key: "rental_vans", label: "Rental vans", icon: <Car size={14} /> },
  { key: "buses", label: "Buses", icon: <Car size={14} /> },
  { key: "tournament_registration", label: "Tournament reg.", icon: <Calendar size={14} /> },
  { key: "referee_fees", label: "Referee fees", icon: <Users size={14} /> },
  { key: "food", label: "Food", icon: <Utensils size={14} /> },
  { key: "equipment_transport", label: "Equipment transport", icon: <Package size={14} /> },
  { key: "uniforms", label: "Uniforms", icon: <Shirt size={14} /> },
  { key: "emergency_reserve", label: "Emergency reserve", icon: <Car size={14} /> },
];

interface GreekTrip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  status: string;
  type: string;
  total_budget?: number | null;
}

export function TravelListPage() {
  const searchParams = useSearchParams();
  const { orgId, orgType } = useOrg();
  const product = travelProductFromOrgType(orgType);
  const isGreek = product === "greek";

  const [sportsTrips, setSportsTrips] = useState<SportsTravelTrip[]>([]);
  const [greekTrips, setGreekTrips] = useState<GreekTrip[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("trips");
  const [createOpen, setCreateOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(20);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [subsidy, setSubsidy] = useState(0);

  const [sportsForm, setSportsForm] = useState({
    title: "", type: "away_game", departureDate: "", returnDate: "", itinerary: "",
    location: { destination: "", venueName: "", address: "", departureLocation: "", meetingPoint: "" } as LocationFieldValues,
  });

  const [greekForm, setGreekForm] = useState({
    name: "", type: "formal", destination: "", departureLocation: "",
    startDate: "", endDate: "", estimatedAttendees: "", visibility: "all_members", templateId: "",
    location: { destination: "", venueName: "", address: "", departureLocation: "", meetingPoint: "" } as LocationFieldValues,
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    if (isGreek) {
      const [tripsRes, tmplRes] = await Promise.all([
        fetch(`/api/greek/travel?org_id=${encodeURIComponent(oid)}`),
        fetch(`/api/greek/travel/templates?org_id=${encodeURIComponent(oid)}`),
      ]);
      if (tripsRes.ok) setGreekTrips((await tripsRes.json()) as GreekTrip[]);
      if (tmplRes.ok) setTemplates((await tmplRes.json()) as typeof templates);
    } else {
      const res = await fetch(`/api/sports/travel?org_id=${encodeURIComponent(oid)}`);
      if (res.ok) setSportsTrips((await res.json()) as SportsTravelTrip[]);
    }
    setLoading(false);
  }, [isGreek]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  async function createTrip() {
    if (!orgId) return;
    if (isGreek) {
      if (!greekForm.name || !greekForm.startDate) return;
      const res = await fetch("/api/greek/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: greekForm.name,
          type: greekForm.type,
          destination: greekForm.location.destination || greekForm.destination,
          departureLocation: greekForm.location.departureLocation || greekForm.departureLocation,
          venueName: greekForm.location.venueName || undefined,
          address: greekForm.location.address || undefined,
          meetingPoint: greekForm.location.meetingPoint || undefined,
          startDate: greekForm.startDate,
          endDate: greekForm.endDate || greekForm.startDate,
          estimatedAttendees: parseInt(greekForm.estimatedAttendees) || 0,
          visibility: greekForm.visibility,
          templateId: greekForm.templateId || undefined,
        }),
      });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error ?? "Failed to create trip");
        return;
      }
      const trip = await res.json();
      toast.success("Trip created!");
      setCreateOpen(false);
      window.location.href = `/travel/${trip.id}`;
      return;
    }

    if (!sportsForm.title || !sportsForm.departureDate) return;
    const res = await fetch("/api/sports/travel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: sportsForm.title,
        destination: sportsForm.location.destination,
        venueName: sportsForm.location.venueName,
        address: sportsForm.location.address,
        departureLocation: sportsForm.location.departureLocation,
        meetingPoint: sportsForm.location.meetingPoint,
        departureDate: sportsForm.departureDate,
        returnDate: sportsForm.returnDate || sportsForm.departureDate,
        itinerary: sportsForm.itinerary,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Failed to create trip");
      return;
    }
    toast.success("Trip created!");
    setCreateOpen(false);
    load(orgId);
  }

  const upcomingGreek = greekTrips.filter((t) => new Date(t.start_date) >= new Date());
  const pastGreek = greekTrips.filter((t) => new Date(t.start_date) < new Date());
  const upcomingSports = sportsTrips.filter((t) => new Date(t.departure_date) >= new Date());
  const pastSports = sportsTrips.filter((t) => new Date(t.departure_date) < new Date());

  const upcoming = isGreek ? upcomingGreek : upcomingSports;
  const past = isGreek ? pastGreek : pastSports;

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);
  const netCost = totalCost - subsidy;
  const perPlayer = playerCount > 0 ? netCost / playerCount : 0;

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Travel"
        description={`${upcoming.length} upcoming trips`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" icon={<Calculator size={14} />} onClick={() => setCalcOpen(true)}>
              Trip calculator
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New trip</Button>
          </div>
        }
      />

      <div className="ds-stat-grid">
        <StatCard title="Upcoming" value={upcoming.length} icon={<Calendar size={18} />} />
        <StatCard title="Past" value={past.length} icon={<Calendar size={18} />} />
        <StatCard title="Templates" value={templates.length} icon={<Plane size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "trips", label: "Upcoming", count: upcoming.length },
          { id: "past", label: "Past", count: past.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="ds-page-skeleton"><div className="ds-page-skeleton-header" /></div>
      ) : (tab === "trips" ? upcoming : past).length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title={tab === "trips" ? "No upcoming trips" : "No past trips"}
          action={tab === "trips" ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Plan trip</Button> : undefined}
        />
      ) : (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          {isGreek
            ? (tab === "trips" ? upcomingGreek : pastGreek).map((trip) => (
              <Card key={trip.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/travel/${trip.id}`} className="type-h2" style={{ margin: 0, textDecoration: "none", color: "inherit" }}>
                        {trip.name}
                      </Link>
                      <Badge label={trip.status} color={trip.status === "confirmed" ? "green" : "yellow"} />
                    </div>
                    {trip.destination && (
                      <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} /> {trip.destination}
                      </p>
                    )}
                    <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                      {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                    </p>
                  </div>
                </div>
              </Card>
            ))
            : (tab === "trips" ? upcomingSports : pastSports).map((trip) => (
              <Card key={trip.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/travel/${trip.id}`} className="type-h2" style={{ margin: 0, textDecoration: "none", color: "inherit" }}>
                        {trip.title}
                      </Link>
                      <Badge label={trip.status} color={trip.status === "confirmed" ? "green" : "yellow"} />
                    </div>
                    {(trip.destination || trip.venue_name) && (
                      <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={12} /> {[trip.venue_name, trip.destination].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                      {formatDate(trip.departure_date)} – {formatDate(trip.return_date)}
                    </p>
                  </div>
                  {trip.total_cost != null && (
                    <p className="type-body" style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                      {formatCurrency(Number(trip.total_cost))}
                    </p>
                  )}
                </div>
              </Card>
            ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New trip"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTrip}>Create trip</Button>
          </>
        }
      >
        {isGreek ? (
          <div className="ds-page-stack" style={{ gap: 12 }}>
            {templates.length > 0 && (
              <Select
                label="Start from template (optional)"
                value={greekForm.templateId}
                onChange={(e) => setGreekForm({ ...greekForm, templateId: e.target.value })}
                options={[
                  { value: "", label: "None" },
                  ...templates.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            )}
            <Input label="Trip name *" value={greekForm.name} onChange={(e) => setGreekForm({ ...greekForm, name: e.target.value })} placeholder="Spring Formal 2026" />
            <Select
              label="Trip type"
              value={greekForm.type}
              onChange={(e) => setGreekForm({ ...greekForm, type: e.target.value })}
              options={tripTypesForProduct("greek").map((t) => ({ value: t.value, label: t.label }))}
            />
            <LocationFields
              variant="travel"
              orgId={orgId ?? undefined}
              values={greekForm.location}
              onChange={(patch) => setGreekForm({ ...greekForm, location: { ...greekForm.location, ...patch } })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Start date *" type="date" value={greekForm.startDate} onChange={(e) => setGreekForm({ ...greekForm, startDate: e.target.value })} />
              <Input label="End date" type="date" value={greekForm.endDate} onChange={(e) => setGreekForm({ ...greekForm, endDate: e.target.value })} />
            </div>
            <Input label="Estimated attendees" type="number" value={greekForm.estimatedAttendees} onChange={(e) => setGreekForm({ ...greekForm, estimatedAttendees: e.target.value })} />
            <Select
              label="Visibility"
              value={greekForm.visibility}
              onChange={(e) => setGreekForm({ ...greekForm, visibility: e.target.value })}
              options={[
                { value: "all_members", label: "All members" },
                { value: "exec_only", label: "Exec only" },
              ]}
            />
            {greekForm.type && (
              <p className="type-small" style={{ color: "var(--color-text-muted)", margin: 0 }}>
                Checklist starter: {starterChecklist("greek", greekForm.type).join(", ")}
              </p>
            )}
          </div>
        ) : (
          <div className="ds-page-stack" style={{ gap: 12 }}>
            <Input label="Trip title *" value={sportsForm.title} onChange={(e) => setSportsForm({ ...sportsForm, title: e.target.value })} placeholder="State Championships – Columbus" />
            <Select
              label="Trip type"
              value={sportsForm.type ?? "away_game"}
              onChange={(e) => setSportsForm({ ...sportsForm, type: e.target.value })}
              options={tripTypesForProduct("sports").map((t) => ({ value: t.value, label: t.label }))}
            />
            <LocationFields variant="travel" orgId={orgId ?? undefined} values={sportsForm.location} onChange={(patch) => setSportsForm({ ...sportsForm, location: { ...sportsForm.location, ...patch } })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Departure date *" type="date" value={sportsForm.departureDate} onChange={(e) => setSportsForm({ ...sportsForm, departureDate: e.target.value })} />
              <Input label="Return date" type="date" value={sportsForm.returnDate} onChange={(e) => setSportsForm({ ...sportsForm, returnDate: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Trip cost calculator" size="lg"
        footer={<Button onClick={() => setCalcOpen(false)}>Done</Button>}
      >
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <Input
            label={isGreek ? "Number of attendees" : "Number of players"}
            type="number"
            value={String(playerCount)}
            onChange={(e) => setPlayerCount(parseInt(e.target.value) || 0)}
          />
          {isGreek ? (
            BUDGET_CATEGORIES.map((cat) => (
              <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="type-small" style={{ width: 160 }}>{cat.label}</span>
                <input
                  type="number"
                  className="ds-input"
                  style={{ flex: 1 }}
                  placeholder="0"
                  value={costs[cat.value] || ""}
                  onChange={(e) => setCosts({ ...costs, [cat.value]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))
          ) : (
            SPORTS_COST_CATEGORIES.map((cat) => (
              <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="type-small" style={{ width: 160, display: "flex", alignItems: "center", gap: 8 }}>{cat.icon}{cat.label}</span>
                <input
                  type="number"
                  className="ds-input"
                  style={{ flex: 1 }}
                  placeholder="0"
                  value={costs[cat.key] || ""}
                  onChange={(e) => setCosts({ ...costs, [cat.key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))
          )}
          <Input label={isGreek ? "Chapter subsidy ($)" : "Team subsidy ($)"} type="number" value={String(subsidy)} onChange={(e) => setSubsidy(parseFloat(e.target.value) || 0)} />
          <div className="ds-card" style={{ padding: 16 }}>
            <p className="type-body" style={{ margin: "0 0 4px" }}>
              Per {isGreek ? "member" : "player"} ({playerCount}): <strong>{formatCurrency(perPlayer)}</strong>
            </p>
            <p className="type-small" style={{ margin: 0, color: "var(--color-text-muted)" }}>Net cost: {formatCurrency(netCost)}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
