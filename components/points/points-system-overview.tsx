"use client";

import { Trophy } from "lucide-react";
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

interface PointEntryWithCategory extends PointEntry {
  category?: string | null;
}

interface PointsSystemOverviewProps {
  rules: Array<{ label: string; points: number }>;
  leaderboard: Array<MemberProfile & { pts: number }>;
  rankByMemberId?: Map<string, number>;
  entries: PointEntryWithCategory[];
  eligibilityMin: number;
  currentMemberId?: string | null;
  isOfficer?: boolean;
}

const RANK_BORDER = ["#B8952A", "#9CA3AF", "#A16207"];

export function PointsSystemOverview({
  leaderboard,
  rankByMemberId,
  entries,
  eligibilityMin,
  currentMemberId,
  isOfficer = false,
}: PointsSystemOverviewProps) {
  const myRow = currentMemberId
    ? leaderboard.find((m) => m.id === currentMemberId)
    : undefined;
  const myRank = currentMemberId
    ? (rankByMemberId?.get(currentMemberId) ?? leaderboard.findIndex((m) => m.id === currentMemberId) + 1)
    : 0;
  const myEvents = currentMemberId
    ? entries.filter((e) => e.member_id === currentMemberId).slice(0, 8)
    : [];

  const myEntries = currentMemberId
    ? entries.filter((e) => e.member_id === currentMemberId)
    : [];

  const categoryBreakdown = myEntries.reduce<Map<string, number>>((acc, e) => {
    const cat = e.category?.trim() || "General";
    const pts = e.entry_type === "deduction" ? -e.points : e.points;
    acc.set(cat, (acc.get(cat) ?? 0) + pts);
    return acc;
  }, new Map());

  return (
    <div className="ds-page-stack">
      {isOfficer && (
        <section>
          <h2 className="type-h2">Top members</h2>
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 15).map((m) => {
                      const rank = rankByMemberId?.get(m.id) ?? 0;
                      return (
                        <tr
                          key={m.id}
                          style={rank > 0 && rank <= 3 ? { borderLeft: `3px solid ${RANK_BORDER[rank - 1]}` } : undefined}
                        >
                          <td className="ds-td-num" style={{ fontFamily: "var(--font-mono)" }}>
                            {rank || "—"}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      )}

      {currentMemberId && (
        <section>
          <h2 className="type-h2" style={{ marginBottom: 16 }}>My points</h2>
          <Card>
            <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
              {isOfficer && (
                <div>
                  <p className="type-label">Your rank</p>
                  <p className="type-display" style={{ fontSize: 28, margin: 0 }}>#{myRank || "—"}</p>
                </div>
              )}
              <div>
                <p className="type-label">Total points</p>
                <p className="type-display" style={{ fontSize: 28, margin: 0 }}>{myRow?.pts ?? 0}</p>
              </div>
            </div>
            {categoryBreakdown.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(categoryBreakdown.entries()).map(([cat, pts]) => (
                  <Badge key={cat} label={`${cat}: ${pts}`} color="blue" />
                ))}
              </div>
            )}
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
