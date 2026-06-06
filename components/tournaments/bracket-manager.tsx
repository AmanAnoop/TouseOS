"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal, Select,
} from "@/components/ui";
import {
  advanceWinner,
  BRACKET_TYPES,
  matchGridRow,
  matchPlayable,
  resolveWinner,
  type BracketMatch,
  type BracketRound,
  type BracketType,
} from "@/lib/tournament-bracket";

interface Bracket {
  id: string;
  title: string;
  status: string;
  bracket_data: { type: BracketType; teams: string[]; rounds: BracketRound[] };
}

function MatchCard({
  match,
  onScore,
}: {
  match: BracketMatch;
  onScore: (score1: number, score2: number) => void;
}) {
  const [s1, setS1] = useState(match.score1 !== null ? String(match.score1) : "");
  const [s2, setS2] = useState(match.score2 !== null ? String(match.score2) : "");

  useEffect(() => {
    setS1(match.score1 !== null ? String(match.score1) : "");
    setS2(match.score2 !== null ? String(match.score2) : "");
  }, [match.score1, match.score2]);

  const playable = matchPlayable(match);

  function submit() {
    const score1 = parseInt(s1, 10);
    const score2 = parseInt(s2, 10);
    if (Number.isNaN(score1) || Number.isNaN(score2)) {
      toast.error("Enter valid scores");
      return;
    }
    if (score1 === score2) {
      toast.error("Scores cannot tie — enter a winner");
      return;
    }
    onScore(score1, score2);
  }

  return (
    <div className="border border-border rounded-lg p-2 text-sm bg-background">
      <div className={`flex justify-between gap-2 ${match.winner === match.team1 ? "font-semibold text-green-600" : ""}`}>
        <span className="truncate">{match.team1}</span>
        {match.score1 !== null && <span className="tabular-nums">{match.score1}</span>}
      </div>
      <div className={`flex justify-between gap-2 mt-1 ${match.winner === match.team2 ? "font-semibold text-green-600" : ""}`}>
        <span className="truncate">{match.team2}</span>
        {match.score2 !== null && <span className="tabular-nums">{match.score2}</span>}
      </div>
      {playable && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
          <input
            type="number"
            min={0}
            className="w-12 h-7 rounded border border-border bg-background px-1.5 text-xs text-center"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            aria-label={`${match.team1} score`}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            className="w-12 h-7 rounded border border-border bg-background px-1.5 text-xs text-center"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
            aria-label={`${match.team2} score`}
          />
          <Button size="sm" variant="secondary" className="text-xs ml-auto" onClick={submit}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function BracketGrid({ rounds, type, onScore }: {
  rounds: BracketRound[];
  type: BracketType;
  onScore: (roundIdx: number, matchId: string, score1: number, score2: number) => void;
}) {
  if (type === "round_robin") {
    const matches = rounds[0]?.matches ?? [];
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            onScore={(score1, score2) => onScore(0, m.id, score1, score2)}
          />
        ))}
      </div>
    );
  }

  const winnersRounds = rounds.filter((r) => r.bracket !== "losers" && r.bracket !== "grand_final");
  const losersRounds = rounds.filter((r) => r.bracket === "losers");
  const grandFinal = rounds.find((r) => r.bracket === "grand_final");

  const renderSection = (sectionRounds: BracketRound[], label?: string, offset = 0) => (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-8 min-w-max items-start">
          {sectionRounds.map((round, ri) => {
            const globalRoundIdx = offset + ri;
            return (
              <div key={`${round.name}-${ri}`} className="w-52 flex-shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 text-center">
                  {round.name}
                </p>
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateRows: `repeat(${round.matches.length * Math.pow(2, globalRoundIdx + 1)}, minmax(0, auto))`,
                  }}
                >
                  {round.matches.map((m, mi) => {
                    const { row, rowSpan } = matchGridRow(globalRoundIdx, mi);
                    return (
                      <div
                        key={m.id}
                        style={{ gridRow: `${row} / span ${rowSpan}`, alignSelf: "center" }}
                      >
                        <MatchCard
                          match={m}
                          onScore={(score1, score2) => onScore(globalRoundIdx, m.id, score1, score2)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSection(winnersRounds, type === "double_elimination" ? "Winners bracket" : undefined, 0)}
      {losersRounds.length > 0 && renderSection(losersRounds, "Losers bracket", winnersRounds.length)}
      {grandFinal && renderSection([grandFinal], "Championship", winnersRounds.length + losersRounds.length)}
    </div>
  );
}

export function TournamentBracketManager({ orgId }: { orgId: string }) {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamsText, setTeamsText] = useState("");
  const [bracketType, setBracketType] = useState<BracketType>("single_elimination");
  const [selected, setSelected] = useState<Bracket | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/brackets?orgId=${orgId}`);
    if (res.ok) {
      const { brackets: data } = await res.json();
      setBrackets(data);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function createBracket() {
    const teams = teamsText.split("\n").map((t) => t.trim()).filter(Boolean);
    if (!title || teams.length < 2) {
      toast.error("Need a title and at least 2 teams");
      return;
    }
    const res = await fetch("/api/tournaments/brackets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, title, teams, bracketType }),
    });
    if (res.ok) {
      toast.success("Bracket created");
      setCreateOpen(false);
      setTitle("");
      setTeamsText("");
      setBracketType("single_elimination");
      load();
    } else toast.error("Failed to create bracket");
  }

  async function reportScore(
    bracketId: string,
    roundIdx: number,
    matchId: string,
    score1: number,
    score2: number,
  ) {
    const bracket = brackets.find((b) => b.id === bracketId) ?? selected;
    if (!bracket) return;

    const round = bracket.bracket_data.rounds[roundIdx];
    const match = round?.matches.find((m) => m.id === matchId);
    if (!match) return;

    const winner = resolveWinner(match, score1, score2);
    if (!winner) {
      toast.error("Scores cannot tie");
      return;
    }

    const rounds = advanceWinner(
      bracket.bracket_data.rounds,
      roundIdx,
      matchId,
      winner,
      score1,
      score2,
      bracket.bracket_data.type,
    );

    await fetch("/api/tournaments/brackets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bracketId, rounds }),
    });

    const updated = { ...bracket, bracket_data: { ...bracket.bracket_data, rounds } };
    setBrackets((prev) => prev.map((b) => (b.id === bracketId ? updated : b)));
    if (selected?.id === bracketId) setSelected(updated);
    toast.success("Score saved — winner advanced");
  }

  const typeLabel = (t: string) =>
    BRACKET_TYPES.find((b) => b.value === t)?.label ?? t.replace(/_/g, " ");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Tournament brackets"
          icon={<Trophy size={16} />}
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Create bracket</Button>}
        />
        {brackets.length === 0 ? (
          <EmptyState
            icon={<Trophy size={20} />}
            title="No brackets yet"
            description="Create single elimination, double elimination, or round robin brackets."
          />
        ) : (
          <div className="space-y-2">
            {brackets.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-sports-300 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.bracket_data.teams.length} teams · {typeLabel(b.bracket_data.type)}
                  </p>
                </div>
                <Badge label={b.status} color={b.status === "active" ? "green" : "gray"} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create tournament bracket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createBracket}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Tournament name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Spring Invitational"
          />
          <Select
            label="Bracket format"
            value={bracketType}
            onChange={(e) => setBracketType(e.target.value as BracketType)}
            options={BRACKET_TYPES.map((b) => ({ value: b.value, label: b.label }))}
          />
          <p className="text-xs text-muted-foreground -mt-1">
            {BRACKET_TYPES.find((b) => b.value === bracketType)?.description}
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">Teams (one per line)</label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={"Team Alpha\nTeam Beta\nTeam Gamma\nTeam Delta"}
              value={teamsText}
              onChange={(e) => setTeamsText(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        size="lg"
      >
        {selected && (
          <BracketGrid
            rounds={selected.bracket_data.rounds}
            type={selected.bracket_data.type}
            onScore={(ri, mid, s1, s2) => reportScore(selected.id, ri, mid, s1, s2)}
          />
        )}
      </Modal>
    </div>
  );
}
