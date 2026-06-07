"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardHeader, Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  org_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

export function PlatformAuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform-admin/audit-logs?limit=100")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setLoading(false);
      });
  }, []);

  const q = filter.trim().toLowerCase();
  const filtered = logs.filter(
    (l) =>
      !q ||
      l.action.toLowerCase().includes(q) ||
      l.org_name.toLowerCase().includes(q) ||
      l.resource_type.toLowerCase().includes(q),
  );

  return (
    <Card>
      <CardHeader
        title="Audit log"
        description="Sensitive actions across all organizations (last 100)"
      />
      <Input
        placeholder="Filter by action, org, resource..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 max-w-md"
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries match.</p>
      ) : (
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {filtered.map((l) => (
            <div key={l.id} className="py-3 flex flex-wrap gap-2 justify-between text-sm">
              <div className="min-w-0">
                <p className="font-medium flex items-center gap-2">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  {l.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {l.org_name} · {l.resource_type}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
