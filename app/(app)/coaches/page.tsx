"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart2, Plus, Target, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Button, Card, CardHeader, EmptyState, Modal,
  PageHeader, StatCard, Textarea,
} from "@/components/ui";

interface Player {
  id: string;
  full_name: string;
  position: string | null;
  attendance_rate: number;
  jersey_number: string | null;
  is_injured: boolean;
}

export default function CoachesPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [gameNotesOpen, setGameNotesOpen] = useState(false);
  const [practiceNotes, setPracticeNotes] = useState("");
  const [gameNotes, setGameNotes] = useState("");

  const [goals] = useState([
    "Win conference championship",
    "Achieve 85% attendance at practices",
    "Develop 3 new players for starting lineup",
  ]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("member_profiles")
      .select("id, full_name, position, attendance_rate, jersey_number, is_injured")
      .eq("org_id", oid)
      .eq("membership_status", "active")
      .order("position")
      .order("full_name");
    setPlayers((data ?? []) as Player[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) load(m.org_id);
    }
    init();
  }, [supabase, load]);

  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))];
  const avgAttendance = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.attendance_rate, 0) / players.length) : 0;
  const injured = players.filter((p) => p.is_injured);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coaching & Captain Tools"
        description="Lineup planning, depth charts, and player development"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<BarChart2 size={14} />} onClick={() => setPracticeOpen(true)}>Practice plan</Button>
            <Button size="sm" icon={<Trophy size={14} />} onClick={() => setGameNotesOpen(true)}>Game notes</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active players" value={players.length} icon={<Users size={18} />} />
        <StatCard title="Avg attendance" value={`${avgAttendance}%`} deltaType={avgAttendance >= 80 ? "up" : "down"} icon={<BarChart2 size={18} />} />
        <StatCard title="Injured" value={injured.length} deltaType={injured.length > 0 ? "down" : "neutral"} icon={<Trophy size={18} />} />
        <StatCard title="Positions" value={positions.length} icon={<Target size={18} />} />
      </div>

      {/* Team goals */}
      <Card>
        <CardHeader title="Team goals" description="Season objectives" action={<Button variant="ghost" size="sm" icon={<Plus size={12} />}>Add</Button>} />
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-border">
              <span className="w-6 h-6 rounded-full bg-sports-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
              <p className="text-sm text-foreground">{goal}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Depth chart by position */}
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
        <div className="grid sm:grid-cols-3 gap-3">{[1,2,3].map((i) => <Card key={i} className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : (
        <Card>
          <EmptyState
            icon={<Users size={24} />}
            title="No player positions set"
            description="Add position info to player profiles to see the depth chart."
          />
        </Card>
      )}

      {/* Practice plan modal */}
      <Modal open={practiceOpen} onClose={() => setPracticeOpen(false)} title="Create practice plan"
        footer={<><Button variant="secondary" onClick={() => setPracticeOpen(false)}>Cancel</Button><Button onClick={() => setPracticeOpen(false)}>Save plan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Warm-up", time: "0:00 – 0:15", default: "Dynamic stretching, light jog" },
              { label: "Drills", time: "0:15 – 0:45", default: "Position-specific skill work" },
              { label: "Scrimmage", time: "0:45 – 1:15", default: "Full team practice game" },
              { label: "Cool-down", time: "1:15 – 1:30", default: "Static stretching, team meeting" },
            ].map((block) => (
              <div key={block.label} className="p-2 rounded-lg bg-surface-1 border border-border col-span-3 sm:col-span-1">
                <p className="text-xs font-bold text-foreground">{block.label}</p>
                <p className="text-xs text-muted-foreground">{block.time}</p>
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

      {/* Game notes modal */}
      <Modal open={gameNotesOpen} onClose={() => setGameNotesOpen(false)} title="Game notes"
        footer={<><Button variant="secondary" onClick={() => setGameNotesOpen(false)}>Cancel</Button><Button onClick={() => setGameNotesOpen(false)}>Save notes</Button></>}
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
