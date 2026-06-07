import { hasItinerary } from "@/lib/itinerary-legs";

import { assessMemberEligibility, type EligibilityIssue } from "@/lib/sports-eligibility";

export interface TravelReadinessInput {
  trip: {
    itinerary: string | null;
    itinerary_legs?: unknown;
    total_cost: number | null;
  };
  rosterCount: number;
  confirmedCount: number;
  driversCount: number;
  hotelAssignedCount: number;
  rosterPaidCount?: number;
  tripFeesPushed?: boolean;
  members: Array<{
    id: string;
    full_name: string;
    membership_status: string;
    payment_status: string;
    attendance_rate: number;
    is_injured?: boolean;
    completedWaiverTypes: string[];
    pointsTotal?: number;
  }>;
  pointsMin?: number;
}

export interface TravelReadinessResult {
  score: number;
  checks: Array<{ key: string; label: string; ok: boolean; detail?: string }>;
  ineligiblePlayers: Array<{ memberId: string; name: string; issues: EligibilityIssue[] }>;
}

export function computeTravelReadiness(input: TravelReadinessInput): TravelReadinessResult {
  const ineligiblePlayers = input.members
    .map((m) => {
      const { eligible, issues } = assessMemberEligibility(
        {
          membershipStatus: m.membership_status,
          paymentStatus: m.payment_status,
          attendanceRate: Number(m.attendance_rate ?? 0),
          isInjured: m.is_injured,
          completedWaiverTypes: m.completedWaiverTypes,
          pointsTotal: m.pointsTotal,
          pointsMin: input.pointsMin,
        },
        { requireTravelWaiver: true, requirePoints: input.pointsMin != null && input.pointsMin > 0 },
      );
      return eligible ? null : { memberId: m.id, name: m.full_name, issues };
    })
    .filter(Boolean) as TravelReadinessResult["ineligiblePlayers"];

  const activeCount = input.members.filter((m) => m.membership_status === "active" || m.membership_status === "new_member").length;
  const waiverOk = ineligiblePlayers.filter((p) =>
    p.issues.some((i) => i.includes("waiver")),
  ).length === 0 || activeCount === 0;

  const checks = [
    {
      key: "itinerary",
      label: "Itinerary",
      ok: hasItinerary(input.trip),
    },
    {
      key: "costs",
      label: "Trip budget",
      ok: Number(input.trip.total_cost ?? 0) > 0,
      detail: input.trip.total_cost ? undefined : "Save trip costs in calculator",
    },
    {
      key: "roster",
      label: "Travel roster",
      ok: input.rosterCount > 0,
      detail: `${input.rosterCount} players`,
    },
    {
      key: "confirmed",
      label: "Roster confirmed",
      ok: input.rosterCount > 0 && input.confirmedCount >= input.rosterCount * 0.8,
      detail: `${input.confirmedCount}/${input.rosterCount} confirmed`,
    },
    {
      key: "waivers",
      label: "Waivers",
      ok: waiverOk && ineligiblePlayers.length < activeCount,
      detail: ineligiblePlayers.length > 0 ? `${ineligiblePlayers.length} ineligible` : undefined,
    },
    {
      key: "drivers",
      label: "Drivers assigned",
      ok: input.driversCount > 0 || input.rosterCount === 0,
      detail: `${input.driversCount} drivers`,
    },
    {
      key: "hotels",
      label: "Hotel assignments",
      ok: input.hotelAssignedCount > 0 || input.rosterCount === 0,
      detail: `${input.hotelAssignedCount} assigned`,
    },
    {
      key: "fees",
      label: "Trip fees collected",
      ok: !input.tripFeesPushed || input.rosterCount === 0 || (input.rosterPaidCount ?? 0) >= input.rosterCount,
      detail: input.tripFeesPushed
        ? `${input.rosterPaidCount ?? 0}/${input.rosterCount} paid`
        : "Push charges after saving budget",
    },
  ];

  const score = checks.length > 0
    ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
    : 0;

  return { score, checks, ineligiblePlayers };
}
