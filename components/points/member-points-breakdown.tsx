"use client";

import { Badge, Modal } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface PointEntry {
  id: string;
  points: number;
  reason: string | null;
  category: string | null;
  entry_type: string;
  created_at: string;
}

export function MemberPointsBreakdown({
  open,
  onClose,
  memberName,
  totalPoints,
  entries,
  categoryFilter,
}: {
  open: boolean;
  onClose: () => void;
  memberName: string;
  totalPoints: number;
  entries: PointEntry[];
  categoryFilter: string | null;
}) {
  const filtered = categoryFilter
    ? entries.filter((e) => (e.category ?? "General") === categoryFilter)
    : entries;

  const categoryTotal = filtered.reduce(
    (s, e) => s + (e.entry_type === "deduction" ? -e.points : e.points),
    0,
  );

  return (
    <Modal open={open} onClose={onClose} title={memberName} size="lg">
      <div className="space-y-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Total points</p>
            <p className="text-2xl font-bold">{totalPoints}</p>
          </div>
          {categoryFilter && (
            <div>
              <p className="text-xs text-muted-foreground">{categoryFilter}</p>
              <p className="text-2xl font-bold">{categoryTotal}</p>
            </div>
          )}
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No entries in this category.</p>
          ) : (
            filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{e.reason ?? "Points"}</p>
                  <div className="flex gap-2 mt-0.5">
                    {e.category && <Badge label={e.category} color="blue" />}
                    <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
                  </div>
                </div>
                <Badge
                  label={`${e.entry_type === "deduction" ? "−" : "+"}${e.points}`}
                  color={e.entry_type === "deduction" ? "red" : "green"}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
