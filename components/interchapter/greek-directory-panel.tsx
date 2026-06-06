"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Badge, Card, EmptyState, SearchInput, Select } from "@/components/ui";

interface DirectoryEntry {
  id: string;
  name: string;
  letters: string;
  kind: "fraternity" | "sorority";
  primary: string;
  secondary: string;
  chapters: Array<{ id: string; name: string; campus: string | null; type: string }>;
  chapterCount: number;
}

interface GreekDirectoryPanelProps {
  orgId: string | null;
}

export function GreekDirectoryPanel({ orgId }: GreekDirectoryPanelProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "fraternity" | "sorority">("all");
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (orgId) params.set("exclude_org_id", orgId);
    if (query.trim()) params.set("q", query.trim());
    if (kind !== "all") params.set("kind", kind);
    const res = await fetch(`/api/interchapter/directory?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDirectory(data.directory ?? []);
    }
    setLoading(false);
  }, [orgId, query, kind]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const withChapters = directory.filter((d) => d.chapterCount > 0);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <SearchInput
          placeholder="Search national org or campus..."
          value={query}
          onChange={setQuery}
        />
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          options={[
            { value: "all", label: "All Greek orgs" },
            { value: "fraternity", label: "Fraternities only" },
            { value: "sorority", label: "Sororities only" },
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}
        </div>
      ) : withChapters.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title="No platform chapters found"
          description="Chapters appear here when they join TouseOS and link their national affiliation."
        />
      ) : (
        <div className="space-y-2">
          {withChapters.map((org) => (
            <Card key={org.id} padding="sm">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left"
                onClick={() => setExpanded(expanded === org.id ? null : org.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${org.primary}, ${org.secondary})` }}
                  >
                    {org.letters.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{org.kind}</p>
                  </div>
                </div>
                <Badge label={`${org.chapterCount} on platform`} color="blue" />
              </button>
              {expanded === org.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  {org.chapters.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-surface-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.campus ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
