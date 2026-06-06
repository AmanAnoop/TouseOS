"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CheckCircle2, CreditCard, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, ProgressBar, Select,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TripLocationPanel } from "@/components/travel/trip-location-panel";
import { TripLogisticsPanel } from "@/components/travel/trip-logistics-panel";
import { ItineraryLegsPanel } from "@/components/travel/itinerary-legs-panel";
import { eligibilityIssueLabel } from "@/lib/sports-eligibility";
import { legsFromTrip, serializeLegsToText, type ItineraryLeg } from "@/lib/itinerary-legs";
import { can } from "@/lib/permissions";
import { useOrg } from "@/hooks/use-org";

const COST_CATEGORIES = [
  "gas", "flights", "hotels", "rental_vans", "buses", "tournament_registration",
  "referee_fees", "food", "equipment_transport", "uniforms", "emergency_reserve",
];

const PAYMENT_STATUS_COLOR: Record<string, "green" | "yellow" | "red" | "gray" | "blue"> = {
  paid: "green",
  pending: "yellow",
  overdue: "red",
  partial: "blue",
  waived: "gray",
};

interface SportsTripDetailProps {
  tripId: string;
}

export function SportsTripDetail({ tripId }: SportsTripDetailProps) {
  const { orgId, role, userId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(null);
  const [roster, setRoster] = useState<Array<Record<string, unknown>>>([]);
  const [available, setAvailable] = useState<Array<Record<string, unknown>>>([]);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [chargeDueDate, setChargeDueDate] = useState("");
  const [playerCount, setPlayerCount] = useState(20);
  const [subsidy, setSubsidy] = useState(0);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [addMemberId, setAddMemberId] = useState("");
  const [itineraryLegs, setItineraryLegs] = useState<ItineraryLeg[]>([]);
  const [savingItinerary, setSavingItinerary] = useState(false);

  const canManage = can(role, "manage_travel");
  const canPushCharges = canManage || can(role, "manage_payments");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/sports/travel/${tripId}?org_id=${encodeURIComponent(oid)}`);
    const data = await res.json();
    if (res.ok) {
      setTrip(data.trip);
      setItineraryLegs(legsFromTrip(data.trip ?? {}));
      setSubsidy(Number(data.trip?.subsidy ?? 0));
      setReadiness(data.readiness);
      setRoster(data.roster ?? []);
      setAvailable(data.availableMembers ?? []);
      const existing: Record<string, number> = {};
      for (const c of data.costs ?? []) {
        existing[String(c.category)] = Number(c.amount);
      }
      setCosts(existing);
      setPlayerCount(Math.max(1, (data.roster ?? []).length || 20));
      if (data.trip?.departure_date) {
        setChargeDueDate(String(data.trip.departure_date));
      }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    if (!orgId || !userId) return;
    (async () => {
      const res = await fetch(`/api/members?org_id=${encodeURIComponent(orgId)}`);
      if (!res.ok) return;
      const members = await res.json() as Array<{ id: string; user_id?: string }>;
      const mine = members.find((m) => m.user_id === userId);
      if (mine) setMyMemberId(mine.id);
    })();
  }, [orgId, userId]);

  async function saveCosts() {
    if (!orgId) return;
    const lineItems = COST_CATEGORIES.map((category) => ({
      category,
      amount: costs[category] || 0,
    })).filter((l) => l.amount > 0);

    const res = await fetch(`/api/sports/travel/${tripId}/costs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, playerCount, subsidy, lineItems }),
    });
    if (res.ok) {
      toast.success("Trip budget saved");
      setCalcOpen(false);
      load(orgId);
    } else toast.error("Failed to save costs");
  }

  async function saveItinerary() {
    if (!orgId) return;
    setSavingItinerary(true);
    const itinerary = serializeLegsToText(itineraryLegs);
    const res = await fetch(`/api/sports/travel/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, itinerary, itineraryLegs }),
    });
    setSavingItinerary(false);
    if (res.ok) {
      toast.success("Itinerary saved");
      load(orgId);
    } else toast.error("Failed to save itinerary");
  }

  async function pushCharges() {
    if (!orgId) return;
    setPushing(true);
    const res = await fetch(`/api/sports/travel/${tripId}/charges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, dueDate: chargeDueDate || undefined }),
    });
    const data = await res.json();
    setPushing(false);
    if (res.ok) {
      toast.success(data.message ?? "Charges pushed");
      setPushOpen(false);
      load(orgId);
    } else {
      toast.error(data.error ?? "Failed to push charges");
    }
  }

  async function rosterAction(memberId: string, action: string, extra?: Record<string, unknown>) {
    if (!orgId) return;
    const res = await fetch(`/api/sports/travel/${tripId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, memberId, action, ...extra }),
    });
    if (res.ok) {
      load(orgId);
      setAddMemberId("");
    }
  }

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);
  const netCost = totalCost - subsidy;
  const perPlayer = playerCount > 0 ? netCost / playerCount : 0;
  const savedPerPlayer = Number(trip?.cost_per_player ?? 0);
  const readinessScore = Number((readiness as { score?: number })?.score ?? 0);
  const checks = ((readiness as { checks?: Array<{ label: string; ok: boolean; detail?: string }> })?.checks) ?? [];
  const ineligible = ((readiness as { ineligiblePlayers?: Array<{ name: string; issues: string[] }> })?.ineligiblePlayers) ?? [];

  const myRosterRow = useMemo(
    () => roster.find((r) => String((r.member_profiles as { id?: string })?.id) === myMemberId),
    [roster, myMemberId],
  );

  if (loading) {
    return <div className="h-64 rounded-xl bg-surface-2 animate-pulse" />;
  }

  if (!trip) {
    return (
      <EmptyState title="Trip not found" action={<Link href="/travel" className="text-sports-600">Back to travel</Link>} />
    );
  }

  return (
    <div className="ds-page-stack">
      <Link href="/travel" className="inline-flex items-center gap-1 text-sm text-sports-600 hover:underline">
        <ArrowLeft size={14} />
        All trips
      </Link>

      <PageHeader
        title={String(trip.title)}
        description={[trip.destination, formatDate(String(trip.departure_date)), formatDate(String(trip.return_date))].filter(Boolean).join(" · ")}
        action={
          canManage ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" className="officer-touch" icon={<Calculator size={14} />} onClick={() => setCalcOpen(true)}>
                Trip calculator
              </Button>
              {canPushCharges && savedPerPlayer > 0 && (
                <Button size="sm" className="officer-touch bg-sports-600 hover:bg-sports-700" icon={<CreditCard size={14} />} onClick={() => setPushOpen(true)}>
                  Push dues
                </Button>
              )}
              <Select
                value={String(trip.status)}
                onChange={async (e) => {
                  await fetch(`/api/sports/travel/${tripId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orgId, status: e.target.value }),
                  });
                  if (orgId) load(orgId);
                }}
                options={[
                  { value: "planning", label: "Planning" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "in_progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </div>
          ) : undefined
        }
      />

      {orgId && (
        <TripLocationPanel
          orgId={orgId}
          tripId={tripId}
          trip={trip}
          canManage={canManage}
          onSaved={() => load(orgId)}
        />
      )}

      {!canManage && savedPerPlayer > 0 && (
        <Card className="border-sports-200 bg-sports-50/50 dark:bg-sports-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Your trip cost</p>
              <p className="text-2xl font-bold text-sports-700 dark:text-sports-400">{formatCurrency(savedPerPlayer)}</p>
              {myRosterRow && (
                <Badge
                  label={`Fee: ${String(myRosterRow.payment_status ?? "not charged")}`}
                  color={PAYMENT_STATUS_COLOR[String(myRosterRow.payment_status ?? "pending")] ?? "gray"}
                  className="mt-2"
                />
              )}
            </div>
            <Link href="/payments" className="text-sm text-sports-600 hover:underline">View payments →</Link>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Travel readiness" icon={<CheckCircle2 size={16} />} />
        <ProgressBar value={readinessScore} label={`${readinessScore}% ready`} color={readinessScore >= 80 ? "green" : readinessScore >= 50 ? "yellow" : "red"} size="md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {checks.map((c) => (
            <div key={c.label} className={`p-2 rounded-lg text-xs ${c.ok ? "bg-green-50 dark:bg-green-950/20 text-green-700" : "bg-red-50 dark:bg-red-950/20 text-red-600"}`}>
              <p className="font-medium">{c.label}</p>
              {c.detail && <p className="opacity-80">{c.detail}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Travel roster" icon={<Users size={16} />} />
          {canManage && (
            <div className="flex gap-2 mb-3">
              <Select
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
                options={available
                  .filter((m) => !roster.some((r) => (r.member_profiles as { id?: string })?.id === m.id))
                  .map((m) => ({ value: String(m.id), label: String(m.full_name) }))}
                placeholder="Add player"
              />
              <Button size="sm" disabled={!addMemberId} onClick={() => rosterAction(addMemberId, "add")}>
                Add
              </Button>
            </div>
          )}
          {roster.length === 0 ? (
            <EmptyState title="No players on travel roster" />
          ) : (
            <div className="space-y-2">
              {roster.map((r) => {
                const mp = r.member_profiles as Record<string, unknown> | null;
                const name = String(mp?.full_name ?? "Player");
                return (
                  <div key={String(r.id)} className="p-2 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{name}</p>
                      <div className="flex gap-1">
                        <Badge label={Boolean(r.confirmed) ? "Confirmed" : "Pending"} color={Boolean(r.confirmed) ? "green" : "yellow"} />
                        {Boolean(r.is_driver) && <Badge label="Driver" color="blue" />}
                      </div>
                    </div>
                    {canManage && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Hotel room"
                            defaultValue={String(r.hotel_assignment ?? "")}
                            onBlur={(e) => rosterAction(String(mp?.id), "update", { hotelAssignment: e.target.value })}
                          />
                          <Input
                            placeholder="Carpool group"
                            defaultValue={String(r.carpool_assignment ?? "")}
                            onBlur={(e) => rosterAction(String(mp?.id), "update", { carpoolAssignment: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => rosterAction(String(mp?.id), "update", { isDriver: !Boolean(r.is_driver) })}
                          >
                            {Boolean(r.is_driver) ? "Remove driver" : "Mark driver"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => rosterAction(String(mp?.id), "update", { confirmed: !Boolean(r.confirmed) })}
                          >
                            {Boolean(r.confirmed) ? "Unconfirm" : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {canManage && (
                      <Button variant="secondary" size="sm" onClick={() => rosterAction(String(mp?.id), "remove")}>
                        Remove
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={canManage ? "Eligibility alerts" : "Trip budget"} />
          {canManage ? (
            ineligible.length === 0 ? (
              <p className="text-sm text-muted-foreground">All active players meet travel requirements.</p>
            ) : (
              <ul className="space-y-2">
                {ineligible.map((p) => (
                  <li key={p.name} className="text-sm p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground"> — {p.issues.map((i) => eligibilityIssueLabel(i as never)).join(", ")}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Trip budget is managed by your travel coordinator. Your share is shown above when charges are posted.
            </p>
          )}
          {trip.total_cost != null && (
            <div className="mt-4 p-3 rounded-lg bg-sports-50 dark:bg-sports-950/20">
              <p className="text-sm">Budget: <strong>{formatCurrency(Number(trip.total_cost))}</strong></p>
              {trip.cost_per_player != null && (
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(trip.cost_per_player))} per player</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <ItineraryLegsPanel
        legs={itineraryLegs}
        canManage={canManage}
        saving={savingItinerary}
        onChange={setItineraryLegs}
        onSave={canManage ? saveItinerary : undefined}
      />

      {orgId && (canManage || Boolean(trip.packing_list) || Boolean(trip.meal_plan)) && (
        <TripLogisticsPanel
          orgId={orgId}
          tripId={tripId}
          trip={trip}
          canManage={canManage}
          onSaved={() => load(orgId)}
        />
      )}

      {!canManage && Boolean(trip.packing_list) && (
        <Card>
          <CardHeader title="Packing list" />
          <p className="text-sm whitespace-pre-wrap">{String(trip.packing_list)}</p>
        </Card>
      )}

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Save trip budget" size="lg"
        footer={<><Button variant="secondary" onClick={() => setCalcOpen(false)}>Cancel</Button><Button className="bg-sports-600 hover:bg-sports-700" onClick={saveCosts}>Save to trip</Button></>}
      >
        <div className="space-y-4">
          <Input label="Players on trip" type="number" value={String(playerCount)} onChange={(e) => setPlayerCount(parseInt(e.target.value, 10) || 0)} />
          {COST_CATEGORIES.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm w-40 capitalize flex-shrink-0">{key.replace(/_/g, " ")}</span>
              <input
                type="number"
                className="flex-1 h-8 rounded-lg border border-border px-3 text-sm"
                value={costs[key] || ""}
                onChange={(e) => setCosts({ ...costs, [key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
          <Input label="Team subsidy ($)" type="number" value={String(subsidy)} onChange={(e) => setSubsidy(parseFloat(e.target.value) || 0)} />
          <div className="p-3 rounded-lg bg-sports-50 dark:bg-sports-950/20 text-sm space-y-1">
            <p>Net: <strong>{formatCurrency(netCost)}</strong></p>
            <p>Per player: <strong>{formatCurrency(perPlayer)}</strong></p>
          </div>
        </div>
      </Modal>

      <Modal
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        title="Push travel charges"
        description={`Create pending payment records for all ${roster.length} roster player(s) at ${formatCurrency(savedPerPlayer)} each.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPushOpen(false)}>Cancel</Button>
            <Button className="bg-sports-600 hover:bg-sports-700" loading={pushing} onClick={pushCharges}>
              Push to payments
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Due date"
            type="date"
            value={chargeDueDate}
            onChange={(e) => setChargeDueDate(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Players who were already charged for this trip will be skipped. Charges appear under Payments with category Travel.
          </p>
        </div>
      </Modal>
    </div>
  );
}
