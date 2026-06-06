"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, ClipboardList, Plus, Target, Trophy, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, CardHeader, EmptyState, Modal,
  PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import {
  AVAILABILITY_STATUSES,
  PRACTICE_BLOCKS,
  availabilityColor,
  availabilityLabel,
  type AvailabilityStatus,
} from "@/lib/coaching-config";

interface Player {
  id: string;
  full_name: string;
  position: string | null;
  attendance_rate: number;
  jersey_number: string | null;
  is_injured: boolean;
}

export default function CoachesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("roster");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [gameNotesOpen, setGameNotesOpen] = useState(false);
  const [practiceNotes, setPracticeNotes] = useState("");
  const [gameNotes, setGameNotes] = useState("");
  const [availability, setAvailability] = useState<Record<string, AvailabilityStatus>>({});

  const { orgId } = useOrg();
  const [goals, setGoals] = useState<Array<{ id: string; content: string }>>([]);
  const [goalInput, setGoalInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [playersRes, notesRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/coaching?org_id=${oid}`).then((r) => (r.ok ? r.json() : [])),
    ]);
    if (playersRes.ok) {
      const all = (await playersRes.json()) as Array<Player & { membership_status: string }>;
      setPlayers(
        all
          .filter((m) => m.membership_status === "active")
          .sort((a, b) => {
            const pa = a.position ?? "";
            const pb = b.position ?? "";
            return pa.localeCompare(pb) || a.full_name.localeCompare(b.full_name);
          }),
      );
    } else {
      setPlayers([]);
    }
    const notes = notesRes as Array<{ id: string; note_type: string; content: string; title: string | null }>;
    setGoals(notes.filter((n) => n.note_type === "goal").map((n) => ({ id: n.id, content: n.content })));
    const practice = notes.find((n) => n.note_type === "practice");
    const game = notes.find((n) => n.note_type === "game");
    if (practice) setPracticeNotes(practice.content);
    if (game) setGameNotes(game.content);

    const availMap: Record<string, AvailabilityStatus> = {};
    notes.filter((n) => n.note_type === "availability" && n.title).forEach((n) => {
      availMap[n.title!] = n.content as AvailabilityStatus;
    });
    setAvailability(availMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  async function saveNote(noteType: "practice" | "game" | "goal", content: string, title?: string) {
    if (!orgId || !content.trim()) return;
    setSaving(true);
    const res = await fetch("/api/coaching", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, noteType, content, title }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Saved");
    load(orgId);
  }

  async function setPlayerAvailability(memberId: string, status: AvailabilityStatus) {
    if (!orgId) return;
    setAvailability((prev) => ({ ...prev, [memberId]: status }));
    const res = await fetch("/api/coaching", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, memberId, availability: status }),
    });
    if (!res.ok) toast.error("Failed to update availability");
  }

  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))];
  const avgAttendance = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.attendance_rate, 0) / players.length) : 0;
  const injured = players.filter((p) => p.is_injured);
  const availableCount = players.filter((p) => (availability[p.id] ?? "available") === "available").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coaching & Captain Tools"
        description="Lineup planning, depth charts, practice plans, and availability"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ClipboardList size={14} />} onClick={() => setPracticeOpen(true)}>Practice plan</Button>
            <Button size="sm" icon={<Trophy size={14} />} onClick={() => setGameNotesOpen(true)}>Game notes</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active players" value={players.length} icon={<Users size={18} />} />
        <StatCard title="Avg attendance" value={`${avgAttendance}%`} deltaType={avgAttendance >= 80 ? "up" : "down"} icon={<BarChart2 size={18} />} />
        <StatCard title="Available" value={availableCount} icon={<Target size={18} />} />
        <StatCard title="Injured" value={injured.length} deltaType={injured.length > 0 ? "down" : "neutral"} icon={<Trophy size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "roster", label: "Roster & depth", count: players.length },
          { id: "practice", label: "Practice & games" },
          { id: "availability", label: "Availability", count: players.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "roster" && (
        <>
          <Card>
            <CardHeader title="Team goals" description="Season objectives" />
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 h-9 rounded-lg border border-border px-3 text-sm"
                placeholder="Add a team goal..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
              <Button size="sm" icon={<Plus size={12} />} onClick={() => { saveNote("goal", goalInput, "Team goal"); setGoalInput(""); }}>Add</Button>
            </div>
            <div className="space-y-2">
              {goals.map((goal, i) => (
                <div key={goal.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-border">
                  <span className="w-6 h-6 rounded-full bg-sports-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                  <p className="text-sm text-foreground">{goal.content}</p>
                </div>
              ))}
            </div>
          </Card>

          {positions.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map((pos) => {
                const posPlayers = players.filter((p) => p.position === pos).sort((a, b) => b.attendance_rate - a.attendance_rate);
                return (
                  <Card key={pos ?? "other"} padding="sm">
                    <p className="font-bold text-sm text-foreground mb-2 capitalize">{pos}</p>
                    <div className="space-y-1.5">
                      {posPlayers.map((player, idx) => (
                        <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg ${idx === 0 ? "bg-sports-50 dark:bg-sports-950/30 border border-sports-200 dark:border-sports-900" : "bg-surface-1"}`}>
                          <span className={`text-xs w-4 flex-shrink-0 ${idx === 0 ? "text-sports-600 font-bold" : "text-muted-foreground"}`}>{idx + 1}</span>
                          {player.jersey_number && (
                            <span className="text-xs text-muted-foreground w-6">#{player.jersey_number}</span>
                          )}
                          <p className="text-xs font-medium flex-1 truncate">{player.full_name}</p>
                          <span className={`text-[10px] font-bold ${player.attendance_rate >= 80 ? "text-green-600" : "text-yellow-600"}`}>
                            {player.attendance_rate}%
                          </span>
                          {player.is_injured && <span className="text-[10px] text-red-500">INJ</span>}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : loading ? (
            <div className="grid sm:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <Card key={i} className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
          ) : (
            <Card>
              <EmptyState
                icon={<Users size={24} />}
                title="No player positions set"
                description="Add position info to player profiles to see the depth chart."
              />
            </Card>
          )}
        </>
      )}

      {tab === "practice" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Practice plan" icon={<ClipboardList size={16} />} action={<Button size="sm" variant="secondary" onClick={() => setPracticeOpen(true)}>Edit</Button>} />
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRACTICE_BLOCKS.map((block) => (
                <div key={block.label} className="p-2 rounded-lg bg-surface-1 border border-border">
                  <p className="text-xs font-bold text-foreground">{block.label}</p>
                  <p className="text-xs text-muted-foreground">{block.time}</p>
                </div>
              ))}
            </div>
            {practiceNotes ? (
              <p className="text-sm whitespace-pre-wrap text-foreground">{practiceNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No practice notes yet.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Game notes" icon={<Trophy size={16} />} action={<Button size="sm" variant="secondary" onClick={() => setGameNotesOpen(true)}>Edit</Button>} />
            {gameNotes ? (
              <p className="text-sm whitespace-pre-wrap text-foreground">{gameNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No game notes yet — add lineup, strategy, and scouting notes.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "availability" && (
        <Card>
          <CardHeader title="Player availability" description="Track who's available for upcoming games and practices" icon={<Users size={16} />} />
          {players.length === 0 ? (
            <EmptyState title="No active players" />
          ) : (
            <div className="space-y-2">
              {players.map((player) => {
                const status = availability[player.id] ?? "available";
                return (
                  <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{player.position ?? "No position"}</p>
                    </div>
                    <Badge label={availabilityLabel(status)} color={availabilityColor(status)} />
                    <Select
                      value={status}
                      onChange={(e) => setPlayerAvailability(player.id, e.target.value as AvailabilityStatus)}
                      options={AVAILABILITY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                      className="w-36"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Modal open={practiceOpen} onClose={() => setPracticeOpen(false)} title="Create practice plan"
        footer={<><Button variant="secondary" onClick={() => setPracticeOpen(false)}>Cancel</Button><Button loading={saving} onClick={() => { saveNote("practice", practiceNotes, "Practice plan"); setPracticeOpen(false); }}>Save plan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PRACTICE_BLOCKS.map((block) => (
              <div key={block.label} className="p-2 rounded-lg bg-surface-1 border border-border">
                <p className="text-xs font-bold text-foreground">{block.label}</p>
                <p className="text-xs text-muted-foreground">{block.time}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{block.default}</p>
              </div>
            ))}
          </div>
          <Textarea
            label="Practice notes"
            placeholder="Focus areas, special drills, player notes..."
            value={practiceNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPracticeNotes(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
      </Modal>

      <Modal open={gameNotesOpen} onClose={() => setGameNotesOpen(false)} title="Game notes"
        footer={<><Button variant="secondary" onClick={() => setGameNotesOpen(false)}>Cancel</Button><Button loading={saving} onClick={() => { saveNote("game", gameNotes, "Game notes"); setGameNotesOpen(false); }}>Save notes</Button></>}
      >
        <Textarea
          label="Game notes (captain/coach only)"
          placeholder="Starting lineup, strategy, opponent scouting, half-time adjustments..."
          value={gameNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGameNotes(e.target.value)}
          className="min-h-[160px]"
        />
      </Modal>
    </div>
  );
}
