"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Plus, RefreshCw, Star, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  StatCard,
} from "@/components/ui";
import type { MemberProfile } from "@/types";

interface MatchRow {
  id: string;
  big_id: string;
  little_id: string;
  status: "suggested" | "confirmed" | "revealed";
  match_score: number | null;
  reveal_date: string | null;
  big?: Partial<MemberProfile> | null;
  little?: Partial<MemberProfile> | null;
}

function enrichMatch(row: MatchRow, members: MemberProfile[]): MatchRow & { big?: MemberProfile; little?: MemberProfile } {
  const bigFromEmbed = row.big as MemberProfile | undefined;
  const littleFromEmbed = row.little as MemberProfile | undefined;
  const big = members.find((m) => m.id === row.big_id) ?? (bigFromEmbed?.full_name ? bigFromEmbed as MemberProfile : undefined);
  const little = members.find((m) => m.id === row.little_id) ?? (littleFromEmbed?.full_name ? littleFromEmbed as MemberProfile : undefined);
  return { ...row, big, little };
}

export default function BigLittlePage() {
  const { orgId } = useOrg();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [matches, setMatches] = useState<Array<MatchRow & { big?: MemberProfile; little?: MemberProfile }>>([]);
  const [loading, setLoading] = useState(true);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedBig, setSelectedBig] = useState<string>("");
  const [selectedLittle, setSelectedLittle] = useState<string>("");
  const [revealDate, setRevealDate] = useState("");
  const [suggestMode, setSuggestMode] = useState(false);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [membersRes, matchesRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}&scope=roster`),
      fetch(`/api/big-little/matches?org_id=${encodeURIComponent(oid)}`),
    ]);
    const memberList = membersRes.ok ? ((await membersRes.json()) as MemberProfile[]) : [];
    if (membersRes.ok) setMembers(memberList);
    const raw = matchesRes.ok ? ((await matchesRes.json()) as MatchRow[]) : [];
    setMatches(raw.filter((m) => m.big_id !== m.little_id).map((m) => enrichMatch(m, memberList)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  function computeMatchScore(big: MemberProfile, little: MemberProfile): number {
    let score = 0;
    // Shared interests
    const bigInterests = (big as MemberProfile & { interests?: string[] }).interests ?? [];
    const littleInterests = (little as MemberProfile & { interests?: string[] }).interests ?? [];
    const sharedInterests = bigInterests.filter((i) => littleInterests.includes(i));
    score += sharedInterests.length * 10;
    // Same major
    if (big.major && little.major && big.major.toLowerCase() === little.major.toLowerCase()) score += 15;
    // Same hometown
    if (big.hometown && little.hometown && big.hometown.toLowerCase() === little.hometown.toLowerCase()) score += 10;
    if (big.class_year && little.class_year && big.class_year === little.class_year) score += 8;
    return Math.min(100, score);
  }

  function generateSuggestions(): Array<{ big: MemberProfile; little: MemberProfile; score: number }> {
    const bigs = activeMembers.filter((m) => !matchedBigIds.has(m.id));
    const newMembers = activeMembers.filter((m) => !matchedLittleIds.has(m.id));
    const suggestions: Array<{ big: MemberProfile; little: MemberProfile; score: number }> = [];

    for (const little of newMembers.slice(0, 5)) {
      const scored = bigs
        .filter((big) => big.id !== little.id)
        .map((big) => ({ big, little, score: computeMatchScore(big, little) }));
      scored.sort((a, b) => b.score - a.score);
      if (scored.length > 0) suggestions.push(scored[0]);
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  async function createMatch() {
    if (!orgId || !selectedBig || !selectedLittle) return;
    if (selectedBig === selectedLittle) {
      toast.error("A member cannot be matched with themselves");
      return;
    }
    const big = members.find((m) => m.id === selectedBig);
    const little = members.find((m) => m.id === selectedLittle);
    const score = big && little ? computeMatchScore(big, little) : null;

    const res = await fetch("/api/big-little/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        bigId: selectedBig,
        littleId: selectedLittle,
        status: "confirmed",
        matchScore: score,
        revealDate: revealDate || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to create match");
      return;
    }
    toast.success("Match created!");
    setMatchOpen(false);
    setSelectedBig("");
    setSelectedLittle("");
    setRevealDate("");
    load(orgId);
  }

  async function updateMatchStatus(id: string, status: "confirmed" | "revealed") {
    if (!orgId) return;
    const res = await fetch("/api/big-little/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    if (!res.ok) {
      toast.error("Failed to update match");
      return;
    }
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    toast.success(`Match ${status}!`);
  }

  const activeMembers = members.filter((m) => m.membership_status === "active");
  const matchedBigIds = new Set(matches.map((m) => m.big_id));
  const matchedLittleIds = new Set(matches.map((m) => m.little_id));

  const suggestions = suggestMode ? generateSuggestions() : [];
  const confirmed = matches.filter((m) => m.status === "confirmed").length;
  const revealed = matches.filter((m) => m.status === "revealed").length;
  const unmatched = activeMembers.filter((m) => !matchedBigIds.has(m.id) && !matchedLittleIds.has(m.id)).length;

  const bigOptions = activeMembers.filter((m) =>
    m.id !== selectedLittle && !matchedBigIds.has(m.id),
  );
  const littleOptions = activeMembers.filter((m) =>
    m.id !== selectedBig && !matchedLittleIds.has(m.id),
  );
  const unmatchedBigs = activeMembers.filter((m) => !matchedBigIds.has(m.id));
  const unmatchedLittles = activeMembers.filter((m) => !matchedLittleIds.has(m.id));

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Big / Little Matching"
        description={`${confirmed} pending reveals · ${revealed} revealed · ${unmatched} unmatched`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => setSuggestMode(!suggestMode)}>
              {suggestMode ? "Hide suggestions" : "AI suggestions"}
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setMatchOpen(true)}>Create match</Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Total matches" value={matches.length} icon={<Heart size={18} />} />
        <StatCard title="Confirmed" value={confirmed} icon={<Star size={18} />} />
        <StatCard title="Revealed" value={revealed} deltaType="up" icon={<Heart size={18} />} />
      </div>

      {/* AI Suggestions */}
      {suggestMode && (
        <Card>
          <CardHeader title="Suggested matches" description="Based on shared interests, major, and hometown" icon={<Star size={16} />} />
          {suggestions.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No suggestions available" description="All members may already be matched." />
          ) : (
            <div className="space-y-3">
              {suggestions.map(({ big, little, score }) => (
                <div key={`${big.id}-${little.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface-1 transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar name={big.full_name} src={big.profile_photo_url} size="sm" />
                    <div className="text-lg">→</div>
                    <Avatar name={little.full_name} src={little.profile_photo_url} size="sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{big.full_name} <span className="text-muted-foreground">→</span> {little.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {big.major === little.major ? "Same major · " : ""}
                      {big.hometown === little.hometown ? "Same hometown · " : ""}
                      {score}% compatibility
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-greek-700">{score}%</span>
                    </div>
                    <Button size="sm" onClick={() => {
                      setSelectedBig(big.id);
                      setSelectedLittle(little.id);
                      setMatchOpen(true);
                    }}>Match</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Unmatched members — two-column layout */}
      {!loading && (unmatchedBigs.length > 0 || unmatchedLittles.length > 0) && (
        <Card>
          <CardHeader title="Unmatched members" description="Members still waiting for a big or little" icon={<Users size={16} />} />
          <div className="big-little-unmatched-grid">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Without a little ({unmatchedBigs.length})
              </p>
              <div className="space-y-2">
                {unmatchedBigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All bigs are matched.</p>
                ) : (
                  unmatchedBigs.map((m) => (
                    <div key={m.id} className="big-little-member-row">
                      <Avatar name={m.full_name} src={m.profile_photo_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.class_year ?? "—"} · {m.major ?? "—"}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedBig(m.id); setMatchOpen(true); }}>Match</Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Without a big ({unmatchedLittles.length})
              </p>
              <div className="space-y-2">
                {unmatchedLittles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All littles are matched.</p>
                ) : (
                  unmatchedLittles.map((m) => (
                    <div key={m.id} className="big-little-member-row">
                      <Avatar name={m.full_name} src={m.profile_photo_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.class_year ?? "—"} · {m.major ?? "—"}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedLittle(m.id); setMatchOpen(true); }}>Match</Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current pairs table */}
      {!loading && matches.length > 0 && (
        <Card>
          <CardHeader title="Current pairs" description={`${matches.length} active match${matches.length !== 1 ? "es" : ""}`} icon={<Heart size={16} />} />
          <div className="ds-table-wrap ds-table-mobile">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Big</th>
                  <th>Little</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Reveal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const big = match.big;
                  const little = match.little;
                  return (
                    <tr key={match.id}>
                      <td data-label="Big">
                        <div className="flex items-center gap-2">
                          {big && <Avatar name={big.full_name} src={big.profile_photo_url} size="sm" />}
                          <span>{big?.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td data-label="Little">
                        <div className="flex items-center gap-2">
                          {little && <Avatar name={little.full_name} src={little.profile_photo_url} size="sm" />}
                          <span>{little?.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td data-label="Score">{match.match_score != null ? `${match.match_score}%` : "—"}</td>
                      <td data-label="Status"><Badge label={match.status} color={match.status === "revealed" ? "green" : "blue"} /></td>
                      <td data-label="Reveal">{match.reveal_date ? new Date(match.reveal_date).toLocaleDateString() : "—"}</td>
                      <td data-label="">
                        {match.status === "confirmed" && (
                          <Button size="sm" variant="secondary" onClick={() => updateMatchStatus(match.id, "revealed")}>
                            Reveal
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} />}
          title="No big/little matches yet"
          description="Create matches manually or use AI suggestions based on member profiles."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setMatchOpen(true)}>Create match</Button>}
        />
      ) : null}

      {/* Create match modal */}
      <Modal
        open={matchOpen}
        onClose={() => setMatchOpen(false)}
        title="Create big/little match"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMatchOpen(false)}>Cancel</Button>
            <Button onClick={createMatch} disabled={!selectedBig || !selectedLittle || selectedBig === selectedLittle}>Create match</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Big</label>
            <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={selectedBig} onChange={(e) => setSelectedBig(e.target.value)}>
              <option value="">Select big...</option>
              {bigOptions.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.class_year ?? "—"})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Little</label>
            <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={selectedLittle} onChange={(e) => setSelectedLittle(e.target.value)}>
              <option value="">Select little...</option>
              {littleOptions.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.class_year ?? "—"})</option>)}
            </select>
          </div>
          {selectedBig && selectedLittle && selectedBig === selectedLittle && (
            <p className="text-sm text-red-600">A member cannot be matched with themselves.</p>
          )}
          {selectedBig && selectedLittle && selectedBig !== selectedLittle && (
            <div className="p-3 bg-greek-50 dark:bg-greek-950/30 rounded-lg">
              <p className="text-sm font-semibold text-greek-700">
                Compatibility: {computeMatchScore(
                  members.find((m) => m.id === selectedBig)!,
                  members.find((m) => m.id === selectedLittle)!,
                )}%
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reveal date (optional)</label>
            <input type="date" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={revealDate} onChange={(e) => setRevealDate(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
