"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Textarea } from "@/components/ui";

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
  const [emergencyContacts, setEmergencyContacts] = useState(
    JSON.stringify(trip.emergency_contacts ?? [], null, 2),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    let contacts: unknown[] = [];
    try {
      contacts = emergencyContacts.trim() ? JSON.parse(emergencyContacts) : [];
      if (!Array.isArray(contacts)) throw new Error("not array");
    } catch {
      toast.error("Emergency contacts must be a JSON array");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sports/travel/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        packingList,
        mealPlan,
        emergencyContacts: contacts,
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
        <Textarea
          label="Emergency contacts (JSON array)"
          value={emergencyContacts}
          onChange={(e) => setEmergencyContacts(e.target.value)}
          rows={4}
          disabled={!canManage}
          placeholder='[{"name":"Coach","phone":"555-0100"}]'
        />
        {canManage && (
          <Button size="sm" onClick={save} loading={saving}>Save logistics</Button>
        )}
      </div>
    </Card>
  );
}
