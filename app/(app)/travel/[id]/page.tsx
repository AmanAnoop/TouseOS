"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calculator, CheckCircle2, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, PageHeader, ProgressBar, Select,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { eligibilityIssueLabel } from "@/lib/sports-eligibility";
import { can, type RoleName } from "@/lib/permissions";

const COST_CATEGORIES = [
  "gas", "flights", "hotels", "rental_vans", "buses", "tournament_registration",
  "referee_fees", "food", "equipment_transport", "uniforms", "emergency_reserve",
];

export default function TravelTripDetailPage() {
  const params = useParams();
  const tripId = String(params.id);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<RoleName>("general_member");
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(null);
  const [roster, setRoster] = useState<Array<Record<string, unknown>>>([]);
  const [available, setAvailable] = useState<Array<Record<string, unknown>>>([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(20);
  const [subsidy, setSubsidy] = useState(0);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [addMemberId, setAddMemberId] = useState("");

  const canManage = can(role, "manage_travel");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/sports/travel/${tripId}?org_id=${encodeURIComponent(oid)}`);
    const data = await res.json();
    if (res.ok) {
      setTrip(data.trip);
      setReadiness(data.readiness);
      setRoster(data.roster ?? []);
      setAvailable(data.availableMembers ?? []);
      const existing: Record<string, number> = {};
      for (const c of data.costs ?? []) {
        existing[String(c.category)] = Number(c.amount);
      }
      setCosts(existing);
      setPlayerCount(Math.max(1, (data.roster ?? []).length || 20));
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
        setOrgId(m.org_id);
        setRole(String(m.role) as RoleName);
        load(m.org_id);
      }
    }
    init();
  }, [load]);

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
  const readinessScore = Number((readiness as { score?: number })?.score ?? 0);
  const checks = ((readiness as { checks?: Array<{ label: string; ok: boolean; detail?: string }> })?.checks) ?? [];
  const ineligible = ((readiness as { ineligiblePlayers?: Array<{ name: string; issues: string[] }> })?.ineligiblePlayers) ?? [];

  if (loading) {
    return <div className="h-64 rounded-xl bg-surface-2 animate-pulse" />;
  }

  if (!trip) {
    return (
      <EmptyState title="Trip not found" action={<Link href="/travel" className="text-sports-600">Back to travel</Link>} />
    );
  }

  return (
    <div className="space-y-5">
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
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Hotel room"
                          defaultValue={String(r.hotel_assignment ?? "")}
                          onBlur={(e) => rosterAction(String(mp?.id), "update", { hotelAssignment: e.target.value })}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => rosterAction(String(mp?.id), "update", { confirmed: !Boolean(r.confirmed) })}
                        >
                          {Boolean(r.confirmed) ? "Unconfirm" : "Confirm"}
                        </Button>
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
          <CardHeader title="Eligibility alerts" />
          {ineligible.length === 0 ? (
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

      {Boolean(trip.itinerary) && (
        <Card>
          <CardHeader title="Itinerary" />
          <p className="text-sm whitespace-pre-wrap">{String(trip.itinerary)}</p>
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
    </div>
  );
}
