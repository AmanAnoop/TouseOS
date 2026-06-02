"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Plus, Scale } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState,
  Modal, PageHeader, Select, StatCard, Tabs, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface StandardsCase {
  id: string;
  respondent_name: string | null;
  case_type: string;
  description: string;
  status: string;
  sanctions: string[];
  hearing_date: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: "yellow",
  hearing_scheduled: "blue",
  resolved: "green",
  appealed: "orange",
  closed: "gray",
};

export default function StandardsPage() {
  const supabase = createClient();
  const [cases, setCases] = useState<StandardsCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<StandardsCase | null>(null);

  const [form, setForm] = useState({
    respondentName: "",
    caseType: "conduct",
    description: "",
    hearingDate: "",
    notes: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("standards_cases")
      .select("*")
      .eq("org_id", oid)
      .order("created_at", { ascending: false });
    setCases((data ?? []) as StandardsCase[]);
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

  async function createCase() {
    if (!orgId || !form.description) return;
    const { error } = await supabase.from("standards_cases").insert({
      org_id: orgId,
      respondent_name: form.respondentName || null,
      case_type: form.caseType,
      description: form.description,
      hearing_date: form.hearingDate || null,
      notes: form.notes || null,
      status: "open",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Case created");
    setCreateOpen(false);
    setForm({ respondentName: "", caseType: "conduct", description: "", hearingDate: "", notes: "" });
    load(orgId);
  }

  async function updateStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === "resolved" || status === "closed") updates.resolved_at = new Date().toISOString();
    await supabase.from("standards_cases").update(updates).eq("id", id);
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
    toast.success(`Case ${status}`);
    setSelected(null);
  }

  const filtered = cases.filter((c) =>
    tab === "all" || c.status === tab || (tab === "open" && ["open", "hearing_scheduled"].includes(c.status)),
  );

  const open = cases.filter((c) => ["open","hearing_scheduled"].includes(c.status)).length;
  const resolved = cases.filter((c) => ["resolved","closed"].includes(c.status)).length;

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
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
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
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Respondent name (optional — leave blank for anonymous)</label>
            <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.respondentName} onChange={(e) => setForm({ ...form, respondentName: e.target.value })} />
          </div>
          <Select label="Case type" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })} options={[
            { value: "conduct", label: "Conduct" },
            { value: "attendance", label: "Attendance violation" },
            { value: "dues", label: "Dues violation" },
            { value: "other", label: "Other" },
          ]} />
          <Textarea label="Description *" placeholder="Describe the situation..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[100px]" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Hearing date (optional)</label>
            <input type="date" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.hearingDate} onChange={(e) => setForm({ ...form, hearingDate: e.target.value })} />
          </div>
          <Textarea label="Notes" placeholder="Internal notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Case detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Case: ${selected.respondent_name ?? "Anonymous"}` : ""}
        size="md"
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
            {selected.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Notes</p>
                <p className="text-sm text-foreground">{selected.notes}</p>
              </div>
            )}
            {selected.hearing_date && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-sm">
                <AlertTriangle size={14} />
                Hearing scheduled: {formatDate(selected.hearing_date)}
              </div>
            )}
            {selected.sanctions?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Sanctions</p>
                <div className="flex flex-wrap gap-2">
                  {selected.sanctions.map((s) => <Badge key={s} label={s} color="red" />)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
