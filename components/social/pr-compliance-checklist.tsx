"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card } from "@/components/ui";
import { PR_COMPLIANCE_ITEMS, isPrComplianceCleared, type PrChecklistState } from "@/lib/pr-compliance";

export function PrComplianceChecklist({
  orgId,
  photoIds,
  onApproved,
}: {
  orgId: string;
  photoIds?: string[];
  onApproved?: () => void;
}) {
  const [checklist, setChecklist] = useState<PrChecklistState>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const cleared = isPrComplianceCleared(checklist);
  const mustClearItems = PR_COMPLIANCE_ITEMS.filter((i) => i.mustClear);

  async function save(approve: boolean) {
    if (approve && !cleared) {
      toast.error("Clear all required safety items before approving");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/pr-compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        photoIds: photoIds ?? [],
        checklist,
        notes,
      }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save review");
      return;
    }
    toast.success(data.all_cleared ? "PR review approved" : "Review saved");
    if (data.all_cleared) onApproved?.();
  }

  return (
    <Card padding="sm" className="bg-surface-1">
      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
        <Shield size={12} />
        PR compliance checklist
      </p>
      <div className="space-y-1">
        {PR_COMPLIANCE_ITEMS.map((item) => (
          <label key={item.id} className="flex items-start gap-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              className="rounded mt-0.5"
              checked={Boolean(checklist[item.id])}
              onChange={(e) => setChecklist({ ...checklist, [item.id]: e.target.checked })}
            />
            <span className={`text-xs ${item.mustClear ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {item.label}
              {item.mustClear ? " *" : ""}
            </span>
          </label>
        ))}
      </div>
      <textarea
        className="w-full mt-2 min-h-[48px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        placeholder="Notes for audit log (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="secondary" loading={saving} onClick={() => save(false)}>
          Save review
        </Button>
        <Button size="sm" loading={saving} onClick={() => save(true)} disabled={!cleared}>
          Approve to post
        </Button>
      </div>
      {!cleared && (
        <p className="text-xs text-amber-600 mt-2">
          Required: confirm no issues for {mustClearItems.map((i) => i.label.split("?")[0]).join(", ")}.
        </p>
      )}
    </Card>
  );
}
