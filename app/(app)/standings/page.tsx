"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { Button, Input, Modal, PageHeader } from "@/components/ui";
import { LeagueStandings } from "@/components/sports/league-standings";
import { computeStandings, type StandingsSummary } from "@/lib/sports-standings";

export default function StandingsPage() {
  const { orgId } = useOrg();
  const [standings, setStandings] = useState<StandingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ opponent: "", scoreUs: "", scoreThem: "", playedAt: "" });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/sports/standings?org_id=${oid}`);
    if (res.ok) {
      const data = await res.json();
      setStandings(data.standings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  async function addGame() {
    if (!orgId || !form.opponent) return;
    const res = await fetch("/api/sports/standings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        opponent: form.opponent,
        scoreUs: parseInt(form.scoreUs, 10) || 0,
        scoreThem: parseInt(form.scoreThem, 10) || 0,
        playedAt: form.playedAt || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Game recorded");
      setAddOpen(false);
      setForm({ opponent: "", scoreUs: "", scoreThem: "", playedAt: "" });
      load(orgId);
    } else toast.error("Failed to record game");
  }

  async function deleteGame(id: string) {
    if (!orgId || !confirm("Remove this game result?")) return;
    await fetch(`/api/sports/standings?id=${id}`, { method: "DELETE" });
    load(orgId);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="League Standings"
        description="Track wins, losses, and game results"
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Log game
          </Button>
        }
      />

      {loading ? (
        <div className="h-48 rounded-xl bg-surface-2 animate-pulse" />
      ) : standings ? (
        <LeagueStandings standings={standings} onDeleteGame={deleteGame} />
      ) : (
        <LeagueStandings standings={computeStandings([])} />
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Log game result"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addGame} disabled={!form.opponent}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Opponent" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} placeholder="State University" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Our score" type="number" value={form.scoreUs} onChange={(e) => setForm({ ...form, scoreUs: e.target.value })} />
            <Input label="Their score" type="number" value={form.scoreThem} onChange={(e) => setForm({ ...form, scoreThem: e.target.value })} />
          </div>
          <Input label="Date played" type="date" value={form.playedAt} onChange={(e) => setForm({ ...form, playedAt: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
