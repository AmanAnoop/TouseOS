"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input, Textarea } from "@/components/ui";

interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
}

function parseContacts(raw: unknown): EmergencyContact[] {
  if (!Array.isArray(raw)) return [{ name: "", phone: "", role: "" }];
  return raw.map((c) => {
    const row = c as Record<string, string>;
    return {
      name: row.name ?? "",
      phone: row.phone ?? "",
      role: row.role ?? "",
    };
  });
}

export function TripLogisticsPanel({
  orgId,
  tripId,
  trip,
  canManage,
  onSaved,
}: {
  orgId: string;
  tripId: string;
  trip: Record<string, unknown>;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [packingList, setPackingList] = useState(String(trip.packing_list ?? ""));
  const [mealPlan, setMealPlan] = useState(String(trip.meal_plan ?? ""));
  const [contacts, setContacts] = useState<EmergencyContact[]>(() =>
    parseContacts(trip.emergency_contacts).length > 0
      ? parseContacts(trip.emergency_contacts)
      : [{ name: "", phone: "", role: "" }],
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const cleaned = contacts
      .filter((c) => c.name.trim() || c.phone.trim())
      .map((c) => ({ name: c.name.trim(), phone: c.phone.trim(), role: c.role.trim() || "Contact" }));

    setSaving(true);
    const res = await fetch(`/api/sports/travel/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        packingList,
        mealPlan,
        emergencyContacts: cleaned,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Logistics saved");
      onSaved();
    } else toast.error("Save failed");
  }

  return (
    <Card>
      <CardHeader title="Trip logistics" />
      <div className="space-y-3">
        <Textarea label="Packing list" value={packingList} onChange={(e) => setPackingList(e.target.value)} rows={4} disabled={!canManage} />
        <Textarea label="Meal plan" value={mealPlan} onChange={(e) => setMealPlan(e.target.value)} rows={3} disabled={!canManage} />
        <div>
          <p className="text-sm font-medium mb-2">Emergency contacts</p>
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="grid sm:grid-cols-3 gap-2 p-2 rounded-lg border border-border">
                <Input
                  placeholder="Name"
                  value={c.name}
                  disabled={!canManage}
                  onChange={(e) => {
                    const next = [...contacts];
                    next[i] = { ...next[i], name: e.target.value };
                    setContacts(next);
                  }}
                />
                <Input
                  placeholder="Phone"
                  value={c.phone}
                  disabled={!canManage}
                  onChange={(e) => {
                    const next = [...contacts];
                    next[i] = { ...next[i], phone: e.target.value };
                    setContacts(next);
                  }}
                />
                <Input
                  placeholder="Role"
                  value={c.role}
                  disabled={!canManage}
                  onChange={(e) => {
                    const next = [...contacts];
                    next[i] = { ...next[i], role: e.target.value };
                    setContacts(next);
                  }}
                />
              </div>
            ))}
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => setContacts([...contacts, { name: "", phone: "", role: "" }])}
            >
              Add contact
            </Button>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={save} loading={saving}>Save logistics</Button>
        )}
      </div>
    </Card>
  );
}
