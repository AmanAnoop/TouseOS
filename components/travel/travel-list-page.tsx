"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calculator, Calendar, Car, Hotel, Plane, Plus, Users, Utensils, Package, Shirt,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, EmptyState, Input,
  Modal, Select, StatCard, Tabs,
} from "@/components/ui";
import { PageShell } from "@/components/layout/page-shell";
import { TravelAiPlanner, type TravelAiPlan } from "@/components/travel/travel-ai-planner";
import { TravelTripCard } from "@/components/travel/travel-trip-card";
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

interface TemplateRow {
  id: string;
  name: string;
  type: string;
  checklist_items?: string[];
}

export function TravelListPage() {
  const searchParams = useSearchParams();
  const { orgId, orgType } = useOrg();
  const product = travelProductFromOrgType(orgType);
  const isGreek = product === "greek";

  const [sportsTrips, setSportsTrips] = useState<SportsTravelTrip[]>([]);
  const [greekTrips, setGreekTrips] = useState<GreekTrip[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => searchParams.get("tab") ?? "trips");
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
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "trips" || requestedTab === "past" || requestedTab === "templates") {
      setTab(requestedTab);
    }
  }, [searchParams]);

  const typeLabels = Object.fromEntries(tripTypesForProduct(product).map((t) => [t.value, t.label]));

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

  function applyAiPlan(plan: TravelAiPlan) {
    if (isGreek) {
      setGreekForm({
        ...greekForm,
        name: plan.tripName ?? greekForm.name,
        type: plan.tripType ?? greekForm.type,
        destination: plan.destination ?? greekForm.destination,
        departureLocation: plan.departureLocation ?? greekForm.departureLocation,
        startDate: plan.startDate?.slice(0, 10) ?? greekForm.startDate,
        endDate: plan.endDate?.slice(0, 10) ?? greekForm.endDate,
        estimatedAttendees: plan.estimatedAttendees != null ? String(plan.estimatedAttendees) : greekForm.estimatedAttendees,
        location: {
          ...greekForm.location,
          destination: plan.destination ?? greekForm.location.destination,
          venueName: plan.venueName ?? greekForm.location.venueName,
          departureLocation: plan.departureLocation ?? greekForm.location.departureLocation,
        },
      });
    } else {
      setSportsForm({
        ...sportsForm,
        title: plan.tripName ?? sportsForm.title,
        type: plan.tripType ?? sportsForm.type,
        departureDate: plan.startDate?.slice(0, 10) ?? sportsForm.departureDate,
        returnDate: plan.endDate?.slice(0, 10) ?? sportsForm.returnDate,
        itinerary: plan.itinerarySummary ?? sportsForm.itinerary,
        location: {
          ...sportsForm.location,
          destination: plan.destination ?? sportsForm.location.destination,
          venueName: plan.venueName ?? sportsForm.location.venueName,
          departureLocation: plan.departureLocation ?? sportsForm.location.departureLocation,
        },
      });
    }
    setCreateOpen(true);
  }

  return (
    <PageShell
      title="Travel"
      breadcrumb={isGreek ? "Chapter trips & retreats" : "Team travel & tournaments"}
      description={`${upcoming.length} upcoming · plan logistics, budgets, and rosters in one place`}
      action={
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={<Calculator size={14} />} onClick={() => setCalcOpen(true)}>
            Cost calculator
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New trip</Button>
        </div>
      }
    >
      <TravelAiPlanner orgId={orgId} product={product} onApply={applyAiPlan} />

      <div className="ds-stat-grid">
        <StatCard title="Upcoming" value={upcoming.length} icon={<Calendar size={18} />} />
        <StatCard title="Past" value={past.length} icon={<Calendar size={18} />} />
        <StatCard title="Templates" value={templates.length} icon={<Plane size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "trips", label: "Upcoming", count: upcoming.length },
          { id: "past", label: "Past", count: past.length },
          ...(isGreek ? [{ id: "templates", label: "Templates", count: templates.length }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "templates" ? (
        loading ? (
          <div className="ds-page-skeleton"><div className="ds-page-skeleton-header" /></div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<Plane size={20} />}
            title="No templates yet"
            description="Complete a trip and save it as a template from the trip detail page."
          />
        ) : (
          <div className="ds-page-stack" style={{ gap: 12 }}>
            {templates.map((t) => (
              <Card key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <p className="type-body" style={{ fontWeight: 500, margin: 0 }}>{t.name}</p>
                    <Badge label={typeLabels[t.type] ?? t.type} color="blue" />
                    {Array.isArray(t.checklist_items) && t.checklist_items.length > 0 && (
                      <p className="type-small" style={{ color: "var(--color-text-muted)", margin: "8px 0 0" }}>
                        {t.checklist_items.length} checklist items
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="ds-page-skeleton"><div className="ds-page-skeleton-header" /></div>
      ) : (tab === "trips" ? upcoming : past).length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title={tab === "trips" ? "No upcoming trips" : "No past trips"}
          action={tab === "trips" ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Plan trip</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {isGreek
            ? (tab === "trips" ? upcomingGreek : pastGreek).map((trip) => (
              <TravelTripCard
                key={trip.id}
                id={trip.id}
                name={trip.name}
                destination={trip.destination}
                startLabel={formatDate(trip.start_date)}
                endLabel={formatDate(trip.end_date)}
                status={trip.status}
                typeLabel={typeLabels[trip.type]}
                totalCost={trip.total_budget}
              />
            ))
            : (tab === "trips" ? upcomingSports : pastSports).map((trip) => (
              <TravelTripCard
                key={trip.id}
                id={trip.id}
                name={trip.title}
                destination={trip.destination}
                venueName={trip.venue_name}
                startLabel={formatDate(trip.departure_date)}
                endLabel={formatDate(trip.return_date)}
                status={trip.status}
                typeLabel={typeLabels[String((trip as { type?: string }).type ?? "away_game")]}
                totalCost={trip.total_cost != null ? Number(trip.total_cost) : null}
              />
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
    </PageShell>
  );
}
