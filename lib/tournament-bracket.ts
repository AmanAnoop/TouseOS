/** Tournament bracket generation, display helpers, and score advancement. */

export type BracketType = "single_elimination" | "double_elimination" | "round_robin";

export interface BracketMatch {
  id: string;
  team1: string;
  team2: string;
  score1: number | null;
  score2: number | null;
  winner: string | null;
  /** Lower bracket slot (double elimination only) */
  bracket?: "winners" | "losers" | "grand_final";
}

export interface BracketRound {
  name: string;
  matches: BracketMatch[];
  bracket?: "winners" | "losers" | "grand_final";
}

export interface BracketData {
  type: BracketType;
  teams: string[];
  rounds: BracketRound[];
}

export const BRACKET_TYPES: Array<{ value: BracketType; label: string; description: string }> = [
  { value: "single_elimination", label: "Single elimination", description: "Lose once and you're out" },
  { value: "double_elimination", label: "Double elimination", description: "Winners + losers bracket" },
  { value: "round_robin", label: "Round robin", description: "Every team plays every other team" },
];

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function emptyMatch(id: string, bracket?: BracketMatch["bracket"]): BracketMatch {
  return { id, team1: "TBD", team2: "TBD", score1: null, score2: null, winner: null, bracket };
}

function roundName(matchCount: number, roundNum: number): string {
  if (matchCount === 1) return "Final";
  if (matchCount === 2) return "Semifinals";
  if (matchCount === 4) return "Quarterfinals";
  return `Round ${roundNum}`;
}

export function buildBracket(type: BracketType, teams: string[]): BracketRound[] {
  if (type === "round_robin") return buildRoundRobin(teams);
  if (type === "double_elimination") return buildDoubleElimination(teams);
  return buildSingleElimination(teams);
}

function buildSingleElimination(teams: string[]): BracketRound[] {
  const padded = [...teams];
  while (padded.length & (padded.length - 1)) padded.push("BYE");

  const round1: BracketMatch[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    round1.push({
      id: `w-r1-${i / 2}`,
      team1: padded[i],
      team2: padded[i + 1],
      score1: null,
      score2: null,
      winner: null,
      bracket: "winners",
    });
  }

  const rounds: BracketRound[] = [{ name: roundName(round1.length, 1), matches: round1, bracket: "winners" }];
  let prevCount = round1.length;
  let roundNum = 2;
  while (prevCount > 1) {
    prevCount = Math.ceil(prevCount / 2);
    const matches = Array.from({ length: prevCount }, (_, i) =>
      emptyMatch(`w-r${roundNum}-${i}`, "winners"),
    );
    rounds.push({ name: roundName(prevCount, roundNum), matches, bracket: "winners" });
    roundNum++;
  }
  return rounds;
}

function buildDoubleElimination(teams: string[]): BracketRound[] {
  const winners = buildSingleElimination(teams);
  const losersRounds: BracketRound[] = [];
  const wR1Count = winners[0].matches.length;

  // Losers bracket mirrors winners depth (simplified double-elim structure)
  let losersMatchCount = Math.max(1, Math.floor(wR1Count / 2));
  let lr = 1;
  while (losersMatchCount >= 1) {
    const matches = Array.from({ length: losersMatchCount }, (_, i) =>
      emptyMatch(`l-r${lr}-${i}`, "losers"),
    );
    losersRounds.push({
      name: losersMatchCount === 1 ? "Losers final" : `Losers R${lr}`,
      matches,
      bracket: "losers",
    });
    if (losersMatchCount === 1) break;
    losersMatchCount = Math.ceil(losersMatchCount / 2);
    lr++;
  }

  const grandFinal: BracketRound = {
    name: "Grand final",
    matches: [emptyMatch("gf-0", "grand_final")],
    bracket: "grand_final",
  };

  return [...winners, ...losersRounds, grandFinal];
}

function buildRoundRobin(teams: string[]): BracketRound[] {
  const matches: BracketMatch[] = [];
  let idx = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: `rr-${idx++}`,
        team1: teams[i],
        team2: teams[j],
        score1: null,
        score2: null,
        winner: null,
      });
    }
  }
  return [{ name: "Round robin", matches }];
}

export function matchPlayable(match: BracketMatch): boolean {
  return (
    match.team1 !== "TBD" &&
    match.team2 !== "TBD" &&
    match.team1 !== "BYE" &&
    match.team2 !== "BYE" &&
    !match.winner
  );
}

export function resolveWinner(match: BracketMatch, score1: number, score2: number): string | null {
  if (score1 === score2) return null;
  return score1 > score2 ? match.team1 : match.team2;
}

/** Advance winner through bracket after a score is recorded. */
export function advanceWinner(
  rounds: BracketRound[],
  roundIdx: number,
  matchId: string,
  winner: string,
  score1: number,
  score2: number,
  bracketType: BracketType,
): BracketRound[] {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  const round = updated[roundIdx];
  const matchIdx = round.matches.findIndex((m) => m.id === matchId);
  if (matchIdx < 0) return updated;

  round.matches[matchIdx] = { ...round.matches[matchIdx], score1, score2, winner };

  if (bracketType === "round_robin") return updated;

  const currentBracket = round.matches[matchIdx].bracket ?? "winners";

  if (bracketType === "single_elimination" || currentBracket === "winners") {
    if (roundIdx + 1 < updated.length && updated[roundIdx + 1].bracket !== "losers") {
      const nextRound = updated[roundIdx + 1];
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? "team1" : "team2";
      if (nextRound.matches[nextMatchIdx]) {
        nextRound.matches[nextMatchIdx] = {
          ...nextRound.matches[nextMatchIdx],
          [slot]: winner,
        };
      }
    }
  }

  // Double elim: drop loser into losers bracket first losers round
  if (bracketType === "double_elimination" && currentBracket === "winners") {
    const loser = round.matches[matchIdx].team1 === winner
      ? round.matches[matchIdx].team2
      : round.matches[matchIdx].team1;
    if (loser && loser !== "TBD" && loser !== "BYE") {
      const losersStart = updated.findIndex((r) => r.bracket === "losers");
      if (losersStart >= 0) {
        const slot = updated[losersStart].matches.findIndex(
          (m) => m.team1 === "TBD" || m.team2 === "TBD",
        );
        if (slot >= 0) {
          const lm = updated[losersStart].matches[slot];
          if (lm.team1 === "TBD") lm.team1 = loser;
          else if (lm.team2 === "TBD") lm.team2 = loser;
        }
      }
    }
  }

  return updated;
}

/** CSS grid row span for bracket tree alignment (single/double elim). */
export function matchGridRow(roundIdx: number, matchIdx: number): { row: number; rowSpan: number } {
  const rowSpan = Math.pow(2, roundIdx);
  const row = matchIdx * rowSpan * 2 + 1;
  return { row, rowSpan };
}

export function paddedTeamCount(teams: number): number {
  return nextPowerOfTwo(teams);
}
