"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { AddressAutocomplete } from "@/components/location/address-autocomplete";
import { requiredSoberMonitors } from "@/lib/risk-config";

const EVENT_TYPES = [
  "Social", "Philanthropy", "Recruitment", "Brotherhood/Sisterhood", "Sports", "Other",
];

interface RiskAssessmentWizardProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  events: Array<{ id: string; title: string }>;
  members: Array<{ id: string; full_name: string }>;
  onSubmitted: () => void;
}

export function RiskAssessmentWizard({
  open, onClose, orgId, events, members, onSubmitted,
}: RiskAssessmentWizardProps) {
  const [step, setStep] = useState(1);
  const [ctx, setCtx] = useState({
    eventId: "",
    eventName: "",
    eventType: "Social",
    expectedAttendance: "50",
    eventDate: "",
    indoor: true,
    alcohol: false,
  });
  const [checklist, setChecklist] = useState<Record<string, string | boolean>>({
    licensedBartender: false,
    soberMonitors: "",
    wristbands: false,
    lastDrinkCutoff: "",
    transportPlan: "",
    weatherChecked: false,
    rainPlan: "",
    emergencyName: "",
    emergencyPhone: "",
    nearestHospital: "",
    firstAidKit: false,
  });
  const [monitorIds, setMonitorIds] = useState<string[]>([]);

  const attendance = parseInt(ctx.expectedAttendance, 10) || 0;
  const recommendedMonitors = requiredSoberMonitors(attendance);

  const completionPct = useMemo(() => {
    const keys = Object.keys(checklist);
    const filled = keys.filter((k) => {
      const v = checklist[k];
      return v !== "" && v !== false;
    }).length;
    return Math.round((filled / keys.length) * 100);
  }, [checklist]);

  function reset() {
    setStep(1);
    setCtx({
      eventId: "", eventName: "", eventType: "Social", expectedAttendance: "50",
      eventDate: "", indoor: true, alcohol: false,
    });
    setChecklist({
      licensedBartender: false, soberMonitors: "", wristbands: false, lastDrinkCutoff: "",
      transportPlan: "", weatherChecked: false, rainPlan: "", emergencyName: "",
      emergencyPhone: "", nearestHospital: "", firstAidKit: false,
    });
    setMonitorIds([]);
  }

  async function submit() {
    const items = {
      alcohol_policy: Boolean(checklist.licensedBartender),
      sober_monitors_assigned: monitorIds.length >= recommendedMonitors,
      guest_ratio_checked: true,
      venue_contract_uploaded: false,
      transportation_plan: Boolean(checklist.transportPlan),
      security_plan: true,
      emergency_plan: Boolean(checklist.emergencyName && checklist.emergencyPhone),
      food_water_plan: true,
    };
    const res = await fetch("/api/risk/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eventId: ctx.eventId || null,
        items,
        riskScore: Math.round((Object.values(items).filter(Boolean).length / Object.keys(items).length) * 100),
        notes: `Event: ${ctx.eventName || "—"} · Monitors: ${monitorIds.length}`,
        metadata: { context: ctx, checklist, monitorIds, expected_attendees: attendance },
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to submit");
      return;
    }
    toast.success("Risk assessment submitted");
    reset();
    onClose();
    onSubmitted();
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title={`Risk assessment — step ${step} of 4`}
      size="lg"
      footer={
        <>
          {step > 1 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit}>Submit assessment</Button>
          )}
        </>
      }
    >
      {step === 1 && (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <Select
            label="Linked event"
            value={ctx.eventId}
            onChange={(e) => {
              const ev = events.find((x) => x.id === e.target.value);
              setCtx({ ...ctx, eventId: e.target.value, eventName: ev?.title ?? ctx.eventName });
            }}
            options={[{ value: "", label: "Select event…" }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
          />
          <Input label="Event name" value={ctx.eventName} onChange={(e) => setCtx({ ...ctx, eventName: e.target.value })} />
          <Select
            label="Event type"
            value={ctx.eventType}
            onChange={(e) => setCtx({ ...ctx, eventType: e.target.value })}
            options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Input label="Expected attendance" type="number" value={ctx.expectedAttendance} onChange={(e) => setCtx({ ...ctx, expectedAttendance: e.target.value })} />
          <Input label="Event date" type="date" value={ctx.eventDate} onChange={(e) => setCtx({ ...ctx, eventDate: e.target.value })} />
          <label className="type-small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={ctx.indoor} onChange={(e) => setCtx({ ...ctx, indoor: e.target.checked })} />
            Indoor event
          </label>
          <label className="type-small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={ctx.alcohol} onChange={(e) => setCtx({ ...ctx, alcohol: e.target.checked })} />
            Alcohol present
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <p className="type-small" style={{ color: "var(--color-text-secondary)" }}>
            Assessment {completionPct}% complete — checklist adapts to your event context.
          </p>
          {ctx.alcohol && (
            <div className="ds-card" style={{ padding: 16 }}>
              <p className="type-h3" style={{ marginBottom: 12 }}>Alcohol policy</p>
              <label className="type-small" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" checked={Boolean(checklist.licensedBartender)} onChange={(e) => setChecklist({ ...checklist, licensedBartender: e.target.checked })} />
                Licensed bartender confirmed
              </label>
              <Input label="Sober monitors assigned (count)" type="number" value={String(checklist.soberMonitors)} onChange={(e) => setChecklist({ ...checklist, soberMonitors: e.target.value })} />
              <label className="type-small" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="checkbox" checked={Boolean(checklist.wristbands)} onChange={(e) => setChecklist({ ...checklist, wristbands: e.target.checked })} />
                Wristband system in place
              </label>
              <Input label="Last drink cutoff" type="time" value={String(checklist.lastDrinkCutoff)} onChange={(e) => setChecklist({ ...checklist, lastDrinkCutoff: e.target.value })} />
              <Textarea label="Transportation plan" value={String(checklist.transportPlan)} onChange={(e) => setChecklist({ ...checklist, transportPlan: e.target.value })} />
            </div>
          )}
          {!ctx.indoor && (
            <div className="ds-card" style={{ padding: 16 }}>
              <p className="type-h3" style={{ marginBottom: 12 }}>Weather plan</p>
              <label className="type-small" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" checked={Boolean(checklist.weatherChecked)} onChange={(e) => setChecklist({ ...checklist, weatherChecked: e.target.checked })} />
                Weather checked within 24h
              </label>
              <Textarea label="Rain contingency plan" value={String(checklist.rainPlan)} onChange={(e) => setChecklist({ ...checklist, rainPlan: e.target.value })} />
            </div>
          )}
          {attendance > 100 && (
            <div className="ds-card" style={{ padding: 16 }}>
              <p className="type-h3">Crowd management</p>
              <p className="type-small">Document door team, guest list limits, and security contacts for events over 100 attendees.</p>
            </div>
          )}
          <div className="ds-card" style={{ padding: 16 }}>
            <p className="type-h3" style={{ marginBottom: 12 }}>Emergency contact</p>
            <Input label="Emergency contact name" value={String(checklist.emergencyName)} onChange={(e) => setChecklist({ ...checklist, emergencyName: e.target.value })} />
            <Input label="Emergency contact phone" value={String(checklist.emergencyPhone)} onChange={(e) => setChecklist({ ...checklist, emergencyPhone: e.target.value })} />
            <AddressAutocomplete
              label="Nearest hospital"
              value={String(checklist.nearestHospital)}
              onSelect={({ address }) => setChecklist({ ...checklist, nearestHospital: address })}
            />
            <label className="type-small" style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input type="checkbox" checked={Boolean(checklist.firstAidKit)} onChange={(e) => setChecklist({ ...checklist, firstAidKit: e.target.checked })} />
              First aid kit on site
            </label>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <p className="type-body">
            Based on expected attendance of <strong>{attendance}</strong>, we recommend{" "}
            <strong>{recommendedMonitors}</strong> sober monitor{recommendedMonitors !== 1 ? "s" : ""}.
          </p>
          <div className="ds-page-stack" style={{ gap: 8 }}>
            {members.slice(0, 20).map((m) => (
              <label key={m.id} className="type-small" style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 36 }}>
                <input
                  type="checkbox"
                  checked={monitorIds.includes(m.id)}
                  onChange={() => {
                    setMonitorIds((prev) =>
                      prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                    );
                  }}
                />
                {m.full_name}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="ds-page-stack" style={{ gap: 12 }}>
          <p className="type-body">Risk assessment {completionPct}% complete.</p>
          <div className="ds-card" style={{ padding: 16 }}>
            <p><strong>{ctx.eventName || "Event"}</strong> · {ctx.eventType}</p>
            <p className="type-small" style={{ color: "var(--color-text-secondary)" }}>
              {attendance} expected attendees · {ctx.indoor ? "Indoor" : "Outdoor"} · Alcohol: {ctx.alcohol ? "Yes" : "No"}
            </p>
            <p className="type-small" style={{ marginTop: 8 }}>
              Sober monitors: {monitorIds.length} selected
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
