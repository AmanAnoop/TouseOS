"use client";

import { ChevronDown, ChevronUp, MapPin, Plus, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { ItineraryLeg } from "@/lib/itinerary-legs";

interface ItineraryLegsPanelProps {
  legs: ItineraryLeg[];
  canManage: boolean;
  saving?: boolean;
  onChange: (legs: ItineraryLeg[]) => void;
  onSave?: () => void;
}

export function ItineraryLegsPanel({
  legs,
  canManage,
  saving,
  onChange,
  onSave,
}: ItineraryLegsPanelProps) {
  function addLeg() {
    onChange([
      ...legs,
      { id: crypto.randomUUID(), title: "", date: "", time: "", location: "", notes: "" },
    ]);
  }

  function updateLeg(id: string, patch: Partial<ItineraryLeg>) {
    onChange(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLeg(id: string) {
    onChange(legs.filter((l) => l.id !== id));
  }

  function moveLeg(id: string, dir: -1 | 1) {
    const idx = legs.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= legs.length) return;
    const copy = [...legs];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  }

  return (
    <Card>
      <CardHeader
        title="Itinerary"
        action={
          canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addLeg}>
                Add leg
              </Button>
              {onSave && (
                <Button size="sm" className="bg-sports-600 hover:bg-sports-700" loading={saving} onClick={onSave}>
                  Save itinerary
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {legs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canManage ? "Add legs to build a structured trip schedule." : "Itinerary not published yet."}
        </p>
      ) : canManage ? (
        <div className="space-y-3">
          {legs.map((leg, idx) => (
            <div key={leg.id} className="p-3 rounded-lg border border-border bg-surface-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Leg {idx + 1}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={idx === 0} onClick={() => moveLeg(leg.id, -1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" disabled={idx === legs.length - 1} onClick={() => moveLeg(leg.id, 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" onClick={() => removeLeg(leg.id)} className="p-1 text-muted-foreground hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input label="Title" value={leg.title} onChange={(e) => updateLeg(leg.id, { title: e.target.value })} placeholder="Depart campus" />
                <Input label="Location" value={leg.location ?? ""} onChange={(e) => updateLeg(leg.id, { location: e.target.value })} placeholder="Student union" />
                <Input label="Date" type="date" value={leg.date ?? ""} onChange={(e) => updateLeg(leg.id, { date: e.target.value })} />
                <Input label="Time" type="time" value={leg.time ?? ""} onChange={(e) => updateLeg(leg.id, { time: e.target.value })} />
              </div>
              <Input label="Notes" value={leg.notes ?? ""} onChange={(e) => updateLeg(leg.id, { notes: e.target.value })} placeholder="Optional details" />
            </div>
          ))}
        </div>
      ) : (
        <ol className="space-y-3">
          {legs.map((leg, idx) => (
            <li key={leg.id} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sports-100 dark:bg-sports-950/40 text-sports-700 text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{leg.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  {leg.date && <span>{formatDate(leg.date)}</span>}
                  {leg.time && <span>{leg.time}</span>}
                  {leg.location && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={10} />
                      {leg.location}
                    </span>
                  )}
                </div>
                {leg.notes && <p className="text-xs text-muted-foreground mt-1">{leg.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
