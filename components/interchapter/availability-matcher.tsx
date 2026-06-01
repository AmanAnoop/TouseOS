"use client";

import { useState } from "react";
import { Calendar, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader, EmptyState, Input, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface AvailabilityEntry {
  id: string;
  user_id: string;
  member_name: string | null;
  available_dates: string[];
  notes: string | null;
  updated_at: string;
}

interface AvailabilityMatcherProps {
  entries: AvailabilityEntry[];
  currentUserId: string;
  memberName: string;
  onSave: (dates: string[], notes: string) => Promise<void>;
}

export function AvailabilityMatcher({
  entries, currentUserId, memberName, onSave,
}: AvailabilityMatcherProps) {
  const mine = entries.find((e) => e.user_id === currentUserId);
  const [dates, setDates] = useState<string[]>(mine?.available_dates ?? []);
  const [notes, setNotes] = useState(mine?.notes ?? "");
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);

  function addDate() {
    if (!newDate || dates.includes(newDate)) return;
    setDates((prev) => [...prev, newDate].sort());
    setNewDate("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(dates, notes);
      toast.success("Availability updated");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  const dateCounts = new Map<string, number>();
  for (const e of entries) {
    for (const d of e.available_dates ?? []) {
      dateCounts.set(d, (dateCounts.get(d) ?? 0) + 1);
    }
  }
  const hotDates = [...dateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Your availability"
          description="Add dates when your chapter is free for joint events"
        />
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="flex-1" />
            <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addDate}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-greek-50 border border-greek-200 text-xs">
                {formatDate(d)}
                <button onClick={() => setDates((prev) => prev.filter((x) => x !== d))}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {dates.length === 0 && (
              <p className="text-xs text-muted-foreground">No dates added yet</p>
            )}
          </div>
          <Textarea
            placeholder="Notes (e.g. prefer Fridays, no homecoming week...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button size="sm" onClick={handleSave} loading={saving}>Save availability</Button>
        </div>
      </Card>

      {hotDates.length > 0 && (
        <Card>
          <CardHeader title="Best overlap dates" description="Dates when most chapters are available" />
          <div className="space-y-2">
            {hotDates.map(([date, count]) => (
              <div key={date} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Calendar size={14} /> {formatDate(date)}
                </span>
                <Badge label={`${count} chapter${count > 1 ? "s" : ""}`} color="green" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Chapter availability board" />
        {entries.length === 0 ? (
          <EmptyState icon={<Calendar size={20} />} title="No availability submitted" description={`Be the first — ${memberName || "your chapter"} can post open dates here.`} />
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="p-3 rounded-lg border border-border">
                <p className="font-medium text-sm">{e.member_name ?? "Chapter member"}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(e.available_dates ?? []).slice(0, 8).map((d) => (
                    <Badge key={d} label={formatDate(d)} color="blue" />
                  ))}
                  {(e.available_dates?.length ?? 0) > 8 && (
                    <Badge label={`+${e.available_dates!.length - 8} more`} color="gray" />
                  )}
                </div>
                {e.notes && <p className="text-xs text-muted-foreground mt-2">{e.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
