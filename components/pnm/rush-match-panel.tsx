"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ProgressBar } from "@/components/ui";
import type { PnmLead } from "@/types";

interface MatchRow {
  id: string;
  score: number;
  shared_interests: string[];
  match_reasons: string[];
  member_profiles: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
    major: string | null;
    hometown: string | null;
  } | null;
}

interface RushMatchPanelProps {
  orgId: string | null;
  pnm: PnmLead | null;
  refreshKey?: number;
}

export function RushMatchPanel({ orgId, pnm, refreshKey }: RushMatchPanelProps) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!orgId || !pnm) return;
    setLoading(true);
    const res = await fetch(
      `/api/pnm/matches?org_id=${orgId}&pnm_id=${pnm.id}${refresh ? "&refresh=true" : ""}`,
    );
    const data = await res.json();
    if (res.ok) {
      setMatches(data.matches ?? []);
      setSummary(data.pnmSummary ?? pnm.ai_interest_summary ?? null);
    } else {
      toast.error(data.error ?? "Could not load matches");
    }
    setLoading(false);
  }, [orgId, pnm]);


  async function recomputeAll() {
    if (!orgId) return;
    setLoading(true);
    const res = await fetch("/api/pnm/matches/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    if (res.ok) {
      toast.success("All PNM matches updated");
      if (pnm) await load(true);
    } else toast.error("Bulk recompute failed");
    setLoading(false);
  }

  useEffect(() => {
    load(false);
  }, [load, refreshKey]);

  if (!pnm) {
    return (
      <Card>
        <EmptyState icon={<Users size={20} />} title="Select a PNM" description="Choose a recruit to see brother compatibility scores." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Brother matches"
        description="Ranked by shared interests, major, hometown, and connections"
        icon={<Users size={16} />}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={loading} onClick={() => recomputeAll()}>
              All PNMs
            </Button>
            <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} loading={loading} onClick={() => load(true)}>
              Recompute
            </Button>
          </div>
        }
      />

      {summary && (
        <p className="text-sm text-muted-foreground mb-4 border-l-2 border-greek-500 pl-3">{summary}</p>
      )}

      {loading && matches.length === 0 ? (
        <div className="h-32 animate-pulse bg-surface-2 rounded-lg" />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Enrich this PNM's interests from their bio, or add interests manually, then recompute."
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const member = m.member_profiles;
            if (!member) return null;
            return (
              <Link
                key={m.id}
                href={`/roster/${member.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors"
              >
                <Avatar name={member.full_name} src={member.profile_photo_url ?? undefined} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{member.full_name}</p>
                    <Badge label={`${m.score}% fit`} color={m.score >= 70 ? "green" : m.score >= 45 ? "yellow" : "gray"} />
                  </div>
                  <ProgressBar value={m.score} size="sm" className="mt-2" color={m.score >= 70 ? "green" : "yellow"} />
                  {m.match_reasons?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">{m.match_reasons.join(" · ")}</p>
                  )}
                  {m.shared_interests?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.shared_interests.slice(0, 5).map((i) => (
                        <span key={i} className="text-[10px] bg-racing-50 text-racing-700 rounded px-1.5 py-0.5">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                  {(member.major || member.hometown) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[member.major, member.hometown].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
