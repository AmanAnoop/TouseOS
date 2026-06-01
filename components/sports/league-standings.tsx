"use client";

import { Trophy } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { StandingsSummary, GameResult } from "@/lib/sports-standings";

interface LeagueStandingsProps {
  standings: StandingsSummary;
  onDeleteGame?: (id: string) => void;
}

export function LeagueStandings({ standings, onDeleteGame }: LeagueStandingsProps) {
  const { wins, losses, ties, pointsFor, pointsAgainst, winPct, streak, games } = standings;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Record" value={`${wins}-${losses}${ties ? `-${ties}` : ""}`} icon={<Trophy size={18} />} />
        <StatCard title="Win %" value={`${winPct}%`} deltaType={winPct >= 50 ? "up" : "down"} icon={<Trophy size={18} />} />
        <StatCard title="Streak" value={streak} icon={<Trophy size={18} />} />
        <StatCard title="Points for" value={pointsFor} icon={<Trophy size={18} />} />
        <StatCard title="Points against" value={pointsAgainst} icon={<Trophy size={18} />} />
      </div>

      <Card>
        <CardHeader title="Game results" />
        {games.length === 0 ? (
          <EmptyState icon={<Trophy size={20} />} title="No games recorded" description="Log your first game result to build standings." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Opponent", "Score", "Result", ""].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map((g: GameResult) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-surface-1">
                    <td className="py-2 px-3">{formatDate(g.played_at)}</td>
                    <td className="py-2 px-3 font-medium">{g.opponent}</td>
                    <td className="py-2 px-3">{g.score_us} – {g.score_them}</td>
                    <td className="py-2 px-3">
                      <Badge
                        label={g.result}
                        color={g.result === "win" ? "green" : g.result === "loss" ? "red" : "gray"}
                      />
                    </td>
                    <td className="py-2 px-3">
                      {onDeleteGame && (
                        <button onClick={() => onDeleteGame(g.id)} className="text-xs text-red-500 hover:underline">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
