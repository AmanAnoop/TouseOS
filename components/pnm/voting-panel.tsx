"use client";

import { useState, useEffect } from "react";
import { Gavel, Star } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Modal, Textarea,
} from "@/components/ui";
import type { PnmLead } from "@/types";

interface Evaluation {
  id: string;
  pnm_id: string;
  evaluator_name: string | null;
  character: number | null;
  involvement: number | null;
  leadership_potential: number | null;
  academic_seriousness: number | null;
  mutual_interest: number | null;
  social_fit: number | null;
  risk_concern: number | null;
  comments: string | null;
  is_anonymous: boolean;
}

interface Props {
  orgId: string;
  leads: PnmLead[];
}

const CRITERIA = [
  { key: "character", label: "Character" },
  { key: "involvement", label: "Involvement" },
  { key: "leadership_potential", label: "Leadership" },
  { key: "academic_seriousness", label: "Academic seriousness" },
  { key: "social_fit", label: "Social fit" },
  { key: "mutual_interest", label: "Mutual interest" },
  { key: "risk_concern", label: "Risk concerns (lower is better)" },
] as const;

export function PnmVotingPanel({ orgId, leads }: Props) {
  const supabase = createClient();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedPnm, setSelectedPnm] = useState<PnmLead | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  useEffect(() => {
    async function load() {
      if (orgId) {
        const res = await fetch(`/api/pnm/evaluations?org_id=${encodeURIComponent(orgId)}`);
        if (res.ok) {
          const all = (await res.json()) as Evaluation[];
          const ids = new Set(leads.map((l) => l.id));
          setEvaluations(all.filter((e) => ids.has(e.pnm_id)));
        }
      }
    }
    if (leads.length && orgId) load();
  }, [supabase, leads, orgId]);

  function avgScore(pnmId: string) {
    const evs = evaluations.filter((e) => e.pnm_id === pnmId);
    if (!evs.length) return null;
    const keys = CRITERIA.map((c) => c.key);
    let total = 0;
    let count = 0;
    for (const ev of evs) {
      for (const k of keys) {
        const v = ev[k as keyof Evaluation];
        if (typeof v === "number") { total += v; count++; }
      }
    }
    return count ? Math.round((total / count) * 10) / 10 : null;
  }

  async function submitEvaluation() {
    if (!selectedPnm) return;
    const res = await fetch("/api/pnm/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        pnmId: selectedPnm.id,
        scores,
        comments,
        anonymous,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to submit");
      return;
    }
    toast.success("Evaluation submitted");
    setEvaluations((prev) => [...prev, data as Evaluation]);
    setSelectedPnm(null);
    setScores({});
    setComments("");
  }

  const bidCandidates = [...leads]
    .filter((l) => !["declined", "removed", "accepted"].includes(l.status))
    .map((l) => ({ lead: l, avg: avgScore(l.id) }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <p className="text-sm text-muted-foreground">
          Values-based voting for bid decisions. Evaluations can be anonymous per chapter policy.
          Only officers with recruitment access can view individual ballots.
        </p>
      </Card>

      {bidCandidates.length === 0 ? (
        <EmptyState icon={<Gavel size={24} />} title="No PNMs to evaluate" description="Add PNMs to the pipeline first." />
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Bid list builder (by avg score)</p>
          {bidCandidates.map(({ lead, avg }, i) => (
            <Card key={lead.id} padding="sm" className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{lead.full_name}</p>
                <p className="text-xs text-muted-foreground">{lead.status.replace(/_/g, " ")} · {evaluations.filter((e) => e.pnm_id === lead.id).length} votes</p>
              </div>
              {avg !== null ? (
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{avg}</span>
                </div>
              ) : (
                <Badge label="No votes" color="gray" />
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelectedPnm(lead)}>Vote</Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedPnm}
        onClose={() => setSelectedPnm(null)}
        title={`Evaluate ${selectedPnm?.full_name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedPnm(null)}>Cancel</Button>
            <Button onClick={submitEvaluation}>Submit vote</Button>
          </>
        }
      >
        <div className="space-y-4">
          {CRITERIA.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">{c.label}</label>
                <span className="text-sm text-muted-foreground">{scores[c.key] ?? 3}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={scores[c.key] ?? 3}
                onChange={(e) => setScores({ ...scores, [c.key]: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </div>
          ))}
          <Textarea label="Comments" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional notes for bid discussion..." />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Submit anonymously
          </label>
        </div>
      </Modal>
    </div>
  );
}
