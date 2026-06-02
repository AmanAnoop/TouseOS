"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Plus, Scale } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Input,
  Modal, PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface RestorativeAction {
  action: string;
  dueDate?: string;
  completed?: boolean;
}

interface StandardsCase {
  id: string;
  respondent_id: string | null;
  respondent_name: string | null;
  case_type: string;
  description: string;
  status: string;
  sanctions: string[];
  restorative_actions: RestorativeAction[];
  hearing_date: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Member {
  id: string;
  full_name: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: "yellow",
  hearing_scheduled: "blue",
  resolved: "green",
  appealed: "orange",
  closed: "gray",
};

const SANCTION_OPTIONS = [
  "Written warning",
  "Probation",
  "Social suspension",
  "Fine",
  "Service hours",
  "Education module",
  "Loss of privileges",
];

export default function StandardsPage() {
  const supabase = createClient();
  const [cases, setCases] = useState<StandardsCase[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<StandardsCase | null>(null);
  const [sanctionInput, setSanctionInput] = useState("");
  const [restorativeForm, setRestorativeForm] = useState({ action: "", dueDate: "" });
  const [editNotes, setEditNotes] = useState("");

  const [form, setForm] = useState({
    respondentId: "",
    respondentName: "",
    caseType: "conduct",
    description: "",
    hearingDate: "",
    notes: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const [{ data: caseData }, { data: memberData }] = await Promise.all([
      supabase
        .from("standards_cases")
        .select("*")
        .eq("org_id", oid)
        .order("created_at", { ascending: false }),
      supabase
        .from("member_profiles")
        .select("id, full_name")
        .eq("org_id", oid)
        .eq("membership_status", "active")
        .order("full_name"),
    ]);
    setCases((caseData ?? []).map((c) => ({
      ...c,
      sanctions: c.sanctions ?? [],
      restorative_actions: (c.restorative_actions ?? []) as RestorativeAction[],
    })) as StandardsCase[]);
    setMembers((memberData ?? []) as Member[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  useEffect(() => {
    if (selected) setEditNotes(selected.notes ?? "");
  }, [selected]);

  async function createCase() {
    if (!orgId || !form.description) return;
    const member = members.find((m) => m.id === form.respondentId);
    const res = await fetch("/api/standards/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        respondentId: form.respondentId || null,
        respondentName: member?.full_name ?? (form.respondentName || null),
        caseType: form.caseType,
        description: form.description,
        hearingDate: form.hearingDate || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create case");
      return;
    }
    toast.success("Case created");
    setCreateOpen(false);
    setForm({ respondentId: "", respondentName: "", caseType: "conduct", description: "", hearingDate: "", notes: "" });
    load(orgId);
  }

  async function patchCase(updates: Record<string, unknown>) {
    if (!orgId || !selected) return;
    const res = await fetch("/api/standards/cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: selected.id, orgId, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Update failed");
      return;
    }
    setCases((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...data } : c)));
    setSelected({ ...selected, ...data });
    toast.success("Case updated");
  }

  async function updateStatus(id: string, status: string) {
    if (!orgId) return;
    const res = await fetch("/api/standards/cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: id, orgId, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Update failed");
      return;
    }
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    if (selected?.id === id) setSelected({ ...selected, ...data });
    toast.success(`Case ${status.replace("_", " ")}`);
    if (status === "closed" || status === "resolved") setSelected(null);
  }

  function addSanction(label: string) {
    if (!selected || !label) return;
    const next = [...new Set([...(selected.sanctions ?? []), label])];
    patchCase({ sanctions: next });
    setSanctionInput("");
  }

  function removeSanction(label: string) {
    if (!selected) return;
    patchCase({ sanctions: (selected.sanctions ?? []).filter((s) => s !== label) });
  }

  function addRestorative() {
    if (!selected || !restorativeForm.action.trim()) return;
    const next = [
      ...(selected.restorative_actions ?? []),
      { action: restorativeForm.action.trim(), dueDate: restorativeForm.dueDate || undefined, completed: false },
    ];
    patchCase({ restorativeActions: next });
    setRestorativeForm({ action: "", dueDate: "" });
  }

  function toggleRestorative(index: number) {
    if (!selected) return;
    const next = (selected.restorative_actions ?? []).map((r, i) =>
      i === index ? { ...r, completed: !r.completed } : r,
    );
    patchCase({ restorativeActions: next });
  }

  const filtered = cases.filter((c) =>
    tab === "all" || c.status === tab || (tab === "open" && ["open", "hearing_scheduled"].includes(c.status)),
  );

  const open = cases.filter((c) => ["open", "hearing_scheduled"].includes(c.status)).length;
  const resolved = cases.filter((c) => ["resolved", "closed"].includes(c.status)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Standards & Accountability"
        description="Manage standards cases with permission controls and audit logs"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New case</Button>}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Open cases" value={open} deltaType={open > 0 ? "down" : "neutral"} icon={<AlertTriangle size={18} />} />
        <StatCard title="Total cases" value={cases.length} icon={<Scale size={18} />} />
        <StatCard title="Resolved" value={resolved} deltaType="up" icon={<Scale size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "open", label: "Open", count: open },
          { id: "resolved", label: "Resolved" },
          { id: "all", label: "All", count: cases.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Scale size={24} />}
          title={tab === "open" ? "No open cases" : "No cases found"}
          action={tab === "open" ? <Button size="sm" onClick={() => setCreateOpen(true)}>Create case</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              onClick={() => setSelected(c)}
              className="cursor-pointer hover:border-greek-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.case_type === "conduct" ? "bg-red-50 dark:bg-red-950/30" : "bg-yellow-50 dark:bg-yellow-950/30"}`}>
                  <Scale size={16} className={c.case_type === "conduct" ? "text-red-600" : "text-yellow-600"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">
                      {c.respondent_name ? `Case: ${c.respondent_name}` : "Anonymous case"}
                    </p>
                    <Badge label={c.status.replace("_", " ")} color={STATUS_COLOR[c.status] as "green"} />
                    <Badge label={c.case_type.replace("_", " ")} color="gray" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Opened {formatDate(c.created_at)}</span>
                    {c.hearing_date && <span className="text-xs text-blue-600">Hearing: {formatDate(c.hearing_date)}</span>}
                    {(c.sanctions?.length ?? 0) > 0 && (
                      <span className="text-xs text-red-600">{c.sanctions.length} sanction(s)</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create standards case"
        description="All case data is restricted to officers with standards permissions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createCase} disabled={!form.description}>Create case</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Respondent (member)"
            value={form.respondentId}
            onChange={(e) => setForm({ ...form, respondentId: e.target.value, respondentName: "" })}
            options={[
              { value: "", label: "Anonymous / not listed" },
              ...members.map((m) => ({ value: m.id, label: m.full_name })),
            ]}
          />
          {!form.respondentId && (
            <Input
              label="Respondent name (if not on roster)"
              value={form.respondentName}
              onChange={(e) => setForm({ ...form, respondentName: e.target.value })}
            />
          )}
          <Select label="Case type" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })} options={[
            { value: "conduct", label: "Conduct" },
            { value: "attendance", label: "Attendance violation" },
            { value: "dues", label: "Dues violation" },
            { value: "other", label: "Other" },
          ]} />
          <Textarea label="Description *" placeholder="Describe the situation..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[100px]" />
          <Input label="Hearing date (optional)" type="date" value={form.hearingDate} onChange={(e) => setForm({ ...form, hearingDate: e.target.value })} />
          <Textarea label="Notes" placeholder="Internal notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Case: ${selected.respondent_name ?? "Anonymous"}` : ""}
        size="lg"
        footer={
          <div className="flex gap-2 flex-wrap w-full">
            {selected?.status === "open" && (
              <>
                <Button variant="secondary" onClick={() => updateStatus(selected.id, "hearing_scheduled")}>Schedule hearing</Button>
                <Button onClick={() => updateStatus(selected.id, "resolved")}>Mark resolved</Button>
              </>
            )}
            {selected?.status === "hearing_scheduled" && (
              <Button onClick={() => updateStatus(selected.id, "resolved")}>Mark resolved</Button>
            )}
            {selected?.status === "resolved" && (
              <Button variant="secondary" onClick={() => updateStatus(selected.id, "closed")}>Close case</Button>
            )}
            <Button variant="secondary" onClick={() => setSelected(null)} className="ml-auto">Close</Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge label={selected.status.replace("_", " ")} color={STATUS_COLOR[selected.status] as "green"} />
              <Badge label={selected.case_type.replace("_", " ")} color="gray" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.description}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Sanctions</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {(selected.sanctions ?? []).map((s) => (
                  <button key={s} type="button" onClick={() => removeSanction(s)} className="inline-flex">
                    <Badge label={`${s} ×`} color="red" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={sanctionInput}
                  onChange={(e) => setSanctionInput(e.target.value)}
                  options={[{ value: "", label: "Add sanction..." }, ...SANCTION_OPTIONS.map((s) => ({ value: s, label: s }))]}
                />
                <Button size="sm" variant="secondary" onClick={() => addSanction(sanctionInput)} disabled={!sanctionInput}>
                  Add
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Restorative actions</p>
              <div className="space-y-2 mb-2">
                {(selected.restorative_actions ?? []).map((r, i) => (
                  <label key={`${r.action}-${i}`} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(r.completed)} onChange={() => toggleRestorative(i)} />
                    <span className={r.completed ? "line-through text-muted-foreground" : ""}>
                      {r.action}
                      {r.dueDate ? ` (due ${formatDate(r.dueDate)})` : ""}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="Action (e.g. apology letter)" value={restorativeForm.action} onChange={(e) => setRestorativeForm({ ...restorativeForm, action: e.target.value })} />
                <Input type="date" value={restorativeForm.dueDate} onChange={(e) => setRestorativeForm({ ...restorativeForm, dueDate: e.target.value })} />
                <Button size="sm" onClick={addRestorative} disabled={!restorativeForm.action.trim()}>Add</Button>
              </div>
            </div>

            <Textarea
              label="Internal notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={() => {
                if (editNotes !== (selected.notes ?? "")) patchCase({ notes: editNotes });
              }}
            />

            {selected.hearing_date && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-sm">
                <AlertTriangle size={14} />
                Hearing scheduled: {formatDate(selected.hearing_date)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
