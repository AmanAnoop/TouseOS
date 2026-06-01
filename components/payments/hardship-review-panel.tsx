"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

interface HardshipRow {
  id: string;
  org_id: string;
  requested_amount: number | null;
  arrangement: string;
  reason: string;
  status: string;
  created_at: string;
  member_profiles?: { full_name: string; email: string } | null;
}

interface HardshipReviewPanelProps {
  orgId: string | null;
}

export function HardshipReviewPanel({ orgId }: HardshipReviewPanelProps) {
  const [rows, setRows] = useState<HardshipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await fetch(`/api/hardship?org_id=${orgId}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, status: "approved" | "denied") {
    if (!orgId) return;
    const res = await fetch("/api/hardship", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    if (res.ok) {
      toast.success(status === "approved" ? "Approved" : "Denied");
      load();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  const pending = rows.filter((r) => r.status === "pending");

  if (loading) return <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;

  if (pending.length === 0) {
    return (
      <Card>
        <CardHeader title="Hardship requests" />
        <EmptyState title="No pending hardship requests" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Hardship requests" description={`${pending.length} pending`} />
      <div className="space-y-3">
        {pending.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{r.member_profiles?.full_name ?? "Member"}</p>
                <p className="text-xs text-muted-foreground">{formatDate(r.created_at)} · {r.arrangement}</p>
              </div>
              {r.requested_amount != null && (
                <Badge label={formatCurrency(Number(r.requested_amount))} color="yellow" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{r.reason}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review(r.id, "approved")}>Approve</Button>
              <Button size="sm" variant="secondary" onClick={() => review(r.id, "denied")}>Deny</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
