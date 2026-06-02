"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState, Input, Modal,
} from "@/components/ui";

interface Match {
  id: string;
  team1: string;
  team2: string;
  score1: number | null;
  score2: number | null;
  winner: string | null;
}

interface Round {
  name: string;
  matches: Match[];
}

interface Bracket {
  id: string;
  title: string;
  status: string;
  bracket_data: { type: string; teams: string[]; rounds: Round[] };
}

export function TournamentBracketManager({ orgId }: { orgId: string }) {
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamsText, setTeamsText] = useState("");
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
      body: JSON.stringify({ orgId, title, teams }),
    });
    if (res.ok) {
      toast.success("Bracket created");
      setCreateOpen(false);
      setTitle("");
      setTeamsText("");
      load();
    } else toast.error("Failed to create bracket");
  }

  async function reportScore(bracketId: string, roundIdx: number, matchId: string, winner: string, score1: number, score2: number) {
    const bracket = brackets.find((b) => b.id === bracketId);
    if (!bracket) return;
    const rounds = [...bracket.bracket_data.rounds];
    const round = { ...rounds[roundIdx], matches: [...rounds[roundIdx].matches] };
    round.matches = round.matches.map((m) =>
      m.id === matchId ? { ...m, score1, score2, winner } : m,
    );
    rounds[roundIdx] = round;

    // Advance winner to next round
    if (roundIdx + 1 < rounds.length) {
      const nextRound = { ...rounds[roundIdx + 1], matches: [...rounds[roundIdx + 1].matches] };
      const matchIdx = round.matches.findIndex((m) => m.id === matchId);
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slot = matchIdx % 2 === 0 ? "team1" : "team2";
      if (nextRound.matches[nextMatchIdx]) {
        nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], [slot]: winner };
        rounds[roundIdx + 1] = nextRound;
      }
    }

    await fetch("/api/tournaments/brackets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bracketId, rounds }),
    });
    setBrackets((prev) => prev.map((b) =>
      b.id === bracketId ? { ...b, bracket_data: { ...b.bracket_data, rounds } } : b,
    ));
    toast.success("Score updated");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Tournament brackets"
          icon={<Trophy size={16} />}
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Create bracket</Button>}
        />
        {brackets.length === 0 ? (
          <EmptyState icon={<Trophy size={20} />} title="No brackets yet" description="Create a single-elimination bracket for your tournament." />
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
                  <p className="text-xs text-muted-foreground">{b.bracket_data.teams.length} teams · {b.bracket_data.type.replace("_", " ")}</p>
                </div>
                <Badge label={b.status} color={b.status === "active" ? "green" : "gray"} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create tournament bracket" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createBracket}>Create</Button></>}>
        <div className="space-y-3">
          <Input label="Tournament name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring Invitational" />
          <div>
            <label className="text-sm font-medium block mb-1">Teams (one per line)</label>
            <textarea className="w-full min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={"Team Alpha\nTeam Beta\nTeam Gamma\nTeam Delta"} value={teamsText} onChange={(e) => setTeamsText(e.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""} size="lg">
        {selected && (
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max pb-4">
              {selected.bracket_data.rounds.map((round, ri) => (
                <div key={round.name} className="w-48 flex-shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{round.name}</p>
                  <div className="space-y-3">
                    {round.matches.map((m) => (
                      <div key={m.id} className="border border-border rounded-lg p-2 text-sm space-y-1">
                        <div className={`flex justify-between ${m.winner === m.team1 ? "font-bold text-green-600" : ""}`}>
                          <span>{m.team1}</span>
                          {m.score1 !== null && <span>{m.score1}</span>}
                        </div>
                        <div className={`flex justify-between ${m.winner === m.team2 ? "font-bold text-green-600" : ""}`}>
                          <span>{m.team2}</span>
                          {m.score2 !== null && <span>{m.score2}</span>}
                        </div>
                        {m.team1 !== "TBD" && m.team2 !== "TBD" && m.team2 !== "BYE" && !m.winner && (
                          <div className="flex gap-1 pt-1">
                            <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => reportScore(selected.id, ri, m.id, m.team1, 1, 0)}>{m.team1.split(" ")[0]} W</Button>
                            <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => reportScore(selected.id, ri, m.id, m.team2, 0, 1)}>{m.team2.split(" ")[0]} W</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
