"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, Users } from "lucide-react";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, SearchInput,
} from "@/components/ui";
import type { PnmLead } from "@/types";

interface ConnectionRow {
  id: string;
  relationship_type: string;
  strength: number;
  is_follow_up_owner: boolean;
  member_profiles: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
    major: string | null;
  } | null;
}

interface PnmConnectionsTabProps {
  orgId: string;
  leads: PnmLead[];
}

export function PnmConnectionsTab({ orgId, leads }: PnmConnectionsTabProps) {
  const [query, setQuery] = useState("");
  const [selectedPnmId, setSelectedPnmId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const activeLeads = leads.filter((l) => !["declined", "removed"].includes(l.status));
  const selectedPnm = activeLeads.find((l) => l.id === selectedPnmId) ?? null;

  const loadConnections = useCallback(async (pnmId: string) => {
    setLoading(true);
    const res = await fetch(`/api/pnm/relationships?org_id=${orgId}&pnm_id=${pnmId}`);
    const data = await res.json();
    if (res.ok) setConnections(data.relationships ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (selectedPnmId) loadConnections(selectedPnmId);
  }, [selectedPnmId, loadConnections]);

  useEffect(() => {
    if (!selectedPnmId && activeLeads.length > 0) {
      setSelectedPnmId(activeLeads[0].id);
    }
  }, [activeLeads, selectedPnmId]);

  const filtered = activeLeads.filter((l) => {
    const q = query.toLowerCase();
    return !q || l.full_name.toLowerCase().includes(q);
  });

  const totalConnections = activeLeads.reduce((sum, l) => {
    const count = (l.active_member_connection ?? "").split(",").filter(Boolean).length;
    return sum + count;
  }, 0);

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-1 max-h-[70vh] overflow-y-auto">
        <CardHeader
          title="PNM connections"
          description={`${totalConnections} logged across pipeline`}
          icon={<GitBranch size={16} />}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Filter PNMs..." className="mb-3" />
        <div className="space-y-1">
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedPnmId(l.id)}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedPnmId === l.id ? "bg-greek-100 dark:bg-greek-950/40 font-medium" : "hover:bg-surface-1"}`}
            >
              <Avatar name={l.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{l.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.status.replace(/_/g, " ")}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title={selectedPnm ? `Connections — ${selectedPnm.full_name}` : "Select a PNM"}
            description="Chapter members who know this recruit"
            icon={<Users size={16} />}
            action={
              selectedPnm ? (
                <Button size="sm" variant="secondary" loading={loading} onClick={() => loadConnections(selectedPnm.id)}>
                  Refresh
                </Button>
              ) : undefined
            }
          />
          {!selectedPnm ? (
            <EmptyState title="Select a PNM" description="Choose a recruit to view their connection graph." />
          ) : loading ? (
            <div className="h-32 animate-pulse bg-surface-2 rounded-lg" />
          ) : connections.length === 0 ? (
            <EmptyState
              title="No connections yet"
              description="Add connections from the Rush matcher tab or accept auto-suggestions."
            />
          ) : (
            <div className="space-y-2">
              {connections.map((r) => {
                const m = r.member_profiles;
                if (!m) return null;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar name={m.full_name} src={m.profile_photo_url ?? undefined} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.relationship_type.replace(/_/g, " ")} · strength {r.strength}/5
                        {m.major ? ` · ${m.major}` : ""}
                      </p>
                    </div>
                    {r.is_follow_up_owner && <Badge label="Follow-up owner" color="blue" />}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
