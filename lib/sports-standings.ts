export interface GameResult {
  id: string;
  opponent: string;
  played_at: string;
  score_us: number;
  score_them: number;
  result: "win" | "loss" | "tie";
  location: string | null;
}

export interface StandingsSummary {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPct: number;
  streak: string;
  games: GameResult[];
}

export function computeStandings(games: GameResult[]): StandingsSummary {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const g of games) {
    pointsFor += g.score_us;
    pointsAgainst += g.score_them;
    if (g.result === "win") wins++;
    else if (g.result === "loss") losses++;
    else ties++;
  }

  const total = wins + losses + ties;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  let streak = "—";
  if (games.length > 0) {
    const sorted = [...games].sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
    );
    const latest = sorted[0].result;
    let count = 0;
    for (const g of sorted) {
      if (g.result !== latest) break;
      count++;
    }
    streak = `${count}${latest === "win" ? "W" : latest === "loss" ? "L" : "T"}`;
  }

  return { wins, losses, ties, pointsFor, pointsAgainst, winPct, streak, games };
}
