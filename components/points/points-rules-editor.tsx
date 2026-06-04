"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
} from "@/components/ui";
import {
  DEFAULT_POINT_RULES,
  mergeRulesWithCatalog,
  slugifyEventType,
  type PointRule,
} from "@/lib/attendance-points";
import { eventTypesForOrgType } from "@/lib/org-product";

interface PointsRulesEditorProps {
  orgId: string;
  orgType: string;
  initialRules: PointRule[];
  persisted: boolean;
  canManage: boolean;
  onSaved: () => void;
}

export function PointsRulesEditor({
  orgId,
  orgType,
  initialRules,
  persisted,
  canManage,
  onSaved,
}: PointsRulesEditorProps) {
  const catalog = useMemo(() => eventTypesForOrgType(orgType || "fraternity"), [orgType]);
  const catalogMerged = useMemo(
    () => mergeRulesWithCatalog(initialRules, catalog),
    [initialRules, catalog],
  );

  const [rules, setRules] = useState<PointRule[]>(catalogMerged);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setRules(mergeRulesWithCatalog(initialRules, catalog));
    }
  }, [initialRules, catalog, dirty]);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState("2");

  function markDirty(next: PointRule[]) {
    setRules(next);
    setDirty(true);
  }

  function updateRule(eventType: string, patch: Partial<PointRule>) {
    markDirty(rules.map((r) => (r.event_type === eventType ? { ...r, ...patch } : r)));
  }

  function adjustPoints(eventType: string, delta: number) {
    const row = rules.find((r) => r.event_type === eventType);
    if (!row) return;
    updateRule(eventType, { points: Math.max(0, Math.min(100, row.points + delta)) });
  }

  function removeRule(eventType: string) {
    markDirty(rules.filter((r) => r.event_type !== eventType));
  }

  function addCustom() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Enter a name for the event type");
      return;
    }
    const event_type = slugifyEventType(label);
    if (rules.some((r) => r.event_type === event_type)) {
      toast.error("That event type already exists");
      return;
    }
    markDirty([
      ...rules,
      {
        event_type,
        label,
        points: Math.max(0, parseInt(newPoints, 10) || 0),
      },
    ]);
    setNewLabel("");
    setNewPoints("2");
    setAddOpen(false);
    toast.success("Event type added — save to apply");
  }

  function addFromCatalog() {
    const merged = mergeRulesWithCatalog(rules, catalog);
    if (merged.length === rules.length) {
      toast("All catalog event types are already listed");
      return;
    }
    markDirty(merged);
    toast.success("Added missing event types from your org catalog");
  }

  function loadDefaults() {
    markDirty(mergeRulesWithCatalog(DEFAULT_POINT_RULES, catalog));
    toast.success("Loaded suggested defaults — save to apply");
  }

  async function save() {
    if (!canManage) return;
    setSaving(true);
    const res = await fetch("/api/attendance-point-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, rules }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to save rules");
      return;
    }
    setDirty(false);
    toast.success("Point rules saved");
    onSaved();
  }

  const activeCount = rules.filter((r) => r.points > 0).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Event type points"
          description={
            canManage
              ? "Set how many points members earn per event type on QR check-in. Use 0 to disable auto-award for a type."
              : "Officers configure these values. Points apply automatically when members check in to matching events."
          }
          action={
            canManage ? (
              <div className="flex flex-wrap gap-2">
                {!persisted && (
                  <Button size="sm" variant="secondary" icon={<Sparkles size={12} />} onClick={loadDefaults}>
                    Suggested defaults
                  </Button>
                )}
                <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addFromCatalog}>
                  Add catalog types
                </Button>
                <Button size="sm" icon={<Plus size={12} />} onClick={() => setAddOpen(true)}>
                  Custom type
                </Button>
              </div>
            ) : undefined
          }
        />

        {!persisted && canManage && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            No saved rules yet for this chapter. Adjust values below and click Save — or start from suggested defaults.
          </p>
        )}

        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.event_type}
              className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors ${
                rule.points > 0 ? "border-greek-200 bg-greek-50/40" : "border-border bg-surface-1"
              }`}
            >
              <GripVertical size={14} className="text-muted-foreground hidden sm:block" />
              <div className="flex-1 min-w-[140px]">
                {canManage ? (
                  <Input
                    value={rule.label ?? ""}
                    onChange={(e) => updateRule(rule.event_type, { label: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                ) : (
                  <p className="font-medium text-sm">{rule.label}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{rule.event_type}</p>
              </div>

              <div className="flex items-center gap-1">
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg border border-border bg-background text-lg leading-none hover:bg-surface-2"
                      onClick={() => adjustPoints(rule.event_type, -1)}
                      aria-label="Decrease points"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-14 h-8 text-center rounded-lg border border-border bg-background text-sm font-semibold"
                      value={rule.points}
                      onChange={(e) =>
                        updateRule(rule.event_type, {
                          points: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg border border-border bg-background text-lg leading-none hover:bg-surface-2"
                      onClick={() => adjustPoints(rule.event_type, 1)}
                      aria-label="Increase points"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <Badge label={`+${rule.points} pts`} color={rule.points > 0 ? "green" : "gray"} />
                )}
              </div>

              {canManage && (
                <button
                  type="button"
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  onClick={() => removeRule(rule.event_type)}
                  title="Remove event type"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {activeCount} of {rules.length} types award points on check-in. Event types must match the type selected when creating an event.
        </p>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button
              size="sm"
              icon={<Save size={14} />}
              loading={saving}
              disabled={!dirty}
              onClick={save}
            >
              Save point rules
            </Button>
            {dirty && (
              <Button
                size="sm"
                variant="secondary"
                icon={<RotateCcw size={12} />}
                onClick={() => {
                  setRules(catalogMerged);
                  setDirty(false);
                }}
              >
                Discard changes
              </Button>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add custom event type"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addCustom}>Add</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Display name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Study hours, Committee meeting..."
          />
          <p className="text-xs text-muted-foreground">
            ID: <span className="font-mono">{newLabel.trim() ? slugifyEventType(newLabel) : "—"}</span>
          </p>
          <Input
            label="Points per check-in"
            type="number"
            min={0}
            max={100}
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
