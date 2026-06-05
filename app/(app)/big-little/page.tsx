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

interface Match {
  id: string;
  big_id: string;
  little_id: string;
  status: "suggested" | "confirmed" | "revealed";
  match_score: number | null;
  reveal_date: string | null;
  big?: MemberProfile;
  little?: MemberProfile;
}


export default function BigLittlePage() {
  const { orgId } = useOrg();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedBig, setSelectedBig] = useState<string>("");
  const [selectedLittle, setSelectedLittle] = useState<string>("");
  const [revealDate, setRevealDate] = useState("");
  const [suggestMode, setSuggestMode] = useState(false);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [membersRes, matchesRes] = await Promise.all([
      fetch(`/api/members?org_id=${encodeURIComponent(oid)}`),
      fetch(`/api/big-little/matches?org_id=${encodeURIComponent(oid)}`),
    ]);
    if (membersRes.ok) setMembers((await membersRes.json()) as MemberProfile[]);
    setMatches(matchesRes.ok ? ((await matchesRes.json()) as Match[]) : []);
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
    const bigs = members.filter((m) => m.membership_status === "active" && !matches.find((match) => match.big_id === m.id));
    const newMembers = members.filter((m) => m.membership_status === "active" && !matches.find((match) => match.little_id === m.id));
    const suggestions: Array<{ big: MemberProfile; little: MemberProfile; score: number }> = [];

    for (const little of newMembers.slice(0, 5)) {
      const scored = bigs.map((big) => ({ big, little, score: computeMatchScore(big, little) }));
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

  const suggestions = suggestMode ? generateSuggestions() : [];
  const confirmed = matches.filter((m) => m.status === "confirmed").length;
  const revealed = matches.filter((m) => m.status === "revealed").length;
  const unmatched = members.filter((m) => m.membership_status === "active" && !matches.find((match) => match.big_id === m.id || match.little_id === m.id)).length;

  const bigOptions = members.filter((m) => !matches.find((match) => match.big_id === m.id));
  const littleOptions = members.filter((m) => !matches.find((match) => match.little_id === m.id));

  return (
    <div className="space-y-5">
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

      {/* Existing matches */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} />}
          title="No big/little matches yet"
          description="Create matches manually or use AI suggestions based on member profiles."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setMatchOpen(true)}>Create match</Button>}
        />
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const big = (match.big as unknown) as MemberProfile;
            const little = (match.little as unknown) as MemberProfile;
            return (
              <Card key={match.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <Avatar name={big?.full_name ?? "?"} src={big?.profile_photo_url} size="sm" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Big</p>
                    </div>
                    <Heart size={14} className="text-greek-500 fill-greek-500" />
                    <div className="text-center">
                      <Avatar name={little?.full_name ?? "?"} src={little?.profile_photo_url} size="sm" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Little</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{big?.full_name ?? "—"} <span className="text-muted-foreground">+</span> {little?.full_name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {match.match_score && <span className="text-xs text-muted-foreground">{match.match_score}% match</span>}
                      {match.reveal_date && <span className="text-xs text-muted-foreground">Reveal: {new Date(match.reveal_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={match.status} color={match.status === "revealed" ? "green" : "blue"} />
                    {match.status === "confirmed" && (
                      <Button size="sm" variant="secondary" onClick={() => updateMatchStatus(match.id, "revealed")}>
                        🎉 Reveal
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create match modal */}
      <Modal
        open={matchOpen}
        onClose={() => setMatchOpen(false)}
        title="Create big/little match"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMatchOpen(false)}>Cancel</Button>
            <Button onClick={createMatch} disabled={!selectedBig || !selectedLittle}>Create match</Button>
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
          {selectedBig && selectedLittle && (
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
