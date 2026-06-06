"use client";

import { Calendar, CheckCircle2, Minus, Trophy } from "lucide-react";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui";
import type { MemberProfile } from "@/types";

interface PointEntry {
  id: string;
  member_id: string;
  points: number;
  reason: string | null;
  entry_type: string;
  created_at: string;
}

interface PointsSystemOverviewProps {
  rules: Array<{ label: string; points: number }>;
  leaderboard: Array<MemberProfile & { pts: number }>;
  entries: PointEntry[];
  eligibilityMin: number;
  currentMemberId?: string | null;
}

const RANK_BORDER = ["#B8952A", "#9CA3AF", "#A16207"];

export function PointsSystemOverview({
  rules,
  leaderboard,
  entries,
  eligibilityMin,
  currentMemberId,
}: PointsSystemOverviewProps) {
  const howItWorks = [
    {
      icon: Calendar,
      label: "Attend an event",
      value: `+${rules.find((r) => r.label.toLowerCase().includes("meeting"))?.points ?? 10} pts`,
    },
    {
      icon: CheckCircle2,
      label: "Complete a module",
      value: "+5 pts",
    },
    {
      icon: Minus,
      label: "Miss mandatory event",
      value: "-10 pts",
    },
  ];

  const myRow = currentMemberId
    ? leaderboard.find((m) => m.id === currentMemberId)
    : undefined;
  const myRank = currentMemberId
    ? leaderboard.findIndex((m) => m.id === currentMemberId) + 1
    : 0;
  const myEvents = currentMemberId
    ? entries.filter((e) => e.member_id === currentMemberId).slice(0, 8)
    : [];

  return (
    <div className="ds-page-stack">
      <section>
        <h2 className="type-h2" style={{ marginBottom: 16 }}>How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {howItWorks.map((card) => (
            <Card key={card.label}>
              <card.icon size={20} style={{ marginBottom: 12, opacity: 0.6 }} aria-hidden />
              <p className="type-h3" style={{ marginBottom: 8 }}>{card.label}</p>
              <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{card.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="type-h2" style={{ marginBottom: 16 }}>Top members</h2>
        <Card padding="none">
          {leaderboard.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title="No standings yet" />
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th className="ds-td-num">Rank</th>
                    <th>Member</th>
                    <th className="ds-td-num">Points</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 15).map((m, i) => (
                    <tr
                      key={m.id}
                      style={i < 3 ? { borderLeft: `3px solid ${RANK_BORDER[i]}` } : undefined}
                    >
                      <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                      <td>
                        <div className="ds-member-identity">
                          <Avatar name={m.full_name} src={m.profile_photo_url} size="sm" />
                          <span className="ds-member-identity-name">{m.full_name}</span>
                        </div>
                      </td>
                      <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)" }}>{m.pts}</td>
                      <td>
                        <Badge
                          label={m.pts >= eligibilityMin ? "Eligible" : "Below min"}
                          color={m.pts >= eligibilityMin ? "green" : "yellow"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {currentMemberId && (
        <section>
          <h2 className="type-h2" style={{ marginBottom: 16 }}>My points</h2>
          <Card>
            <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <p className="type-label">Your rank</p>
                <p className="type-display" style={{ fontSize: 28, margin: 0 }}>#{myRank || "—"}</p>
              </div>
              <div>
                <p className="type-label">Total points</p>
                <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{myRow?.pts ?? 0}</p>
              </div>
            </div>
            {myEvents.length === 0 ? (
              <p className="type-small" style={{ color: "var(--color-text-secondary)" }}>No point events yet.</p>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th className="ds-td-num">Points</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEvents.map((e) => (
                      <tr key={e.id}>
                        <td>{e.reason ?? "Points"}</td>
                        <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)" }}>
                          {e.entry_type === "deduction" ? "−" : "+"}{e.points}
                        </td>
                        <td className="type-small" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
