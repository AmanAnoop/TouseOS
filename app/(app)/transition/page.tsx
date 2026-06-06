"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Download, Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Button, Card, CardHeader, EmptyState, Modal,
  PageHeader, Select, Tabs, Textarea,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import type { TransitionBinder } from "@/types";
import { buildTransitionBinderHtml, downloadTransitionBinderHtml } from "@/lib/transition-export";

const BINDER_ROLES = [
  "president","treasurer","social_chair","recruitment_chair","risk_manager",
  "philanthropy_chair","alumni_chair","nme_chair","captain","travel_coordinator","equipment_manager",
];

export default function TransitionPage() {
  const { orgId, orgName, role } = useOrg();
  const [binders, setBinders] = useState<TransitionBinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("view");
  const [selectedBinder, setSelectedBinder] = useState<TransitionBinder | null>(null);

  const [form, setForm] = useState({
    role: "", semester: "fall", year: String(new Date().getFullYear()),
    responsibilities: "", keyDeadlines: "", keyContacts: "",
    vendorNotes: "", budgetNotes: "", lessonsLearned: "",
    unfinishedTasks: "", recommendations: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/transition/binders?org_id=${encodeURIComponent(oid)}`);
    setBinders(res.ok ? ((await res.json()) as TransitionBinder[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    if (role) setForm((prev) => (prev.role ? prev : { ...prev, role: String(role) }));
  }, [role]);

  async function saveBinder() {
    if (!orgId || !form.role) return;
    const res = await fetch("/api/transition/binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        role: form.role,
        semester: form.semester,
        year: form.year,
        responsibilities: form.responsibilities,
        lessonsLearned: form.lessonsLearned,
        recommendations: form.recommendations,
        keyDeadlinesText: form.keyDeadlines,
        keyContactsText: form.keyContacts,
        vendorNotes: form.vendorNotes,
        budgetNotes: form.budgetNotes,
        unfinishedTasks: form.unfinishedTasks,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    toast.success("Transition binder saved");
    load(orgId);
  }

  const SECTIONS = [
    { key: "responsibilities", label: "Recurring responsibilities", placeholder: "List your main recurring duties and when they happen...\n\nExample:\n- Weekly: Send chapter meeting agenda by Thursday\n- Monthly: Compile attendance reports\n- Semesterly: Coordinate officer elections" },
    { key: "lessonsLearned", label: "Lessons learned", placeholder: "What would you tell your successor that you wish someone had told you?" },
    { key: "unfinishedTasks", label: "Unfinished tasks & active projects", placeholder: "List anything that needs to be handed off or continued..." },
    { key: "vendorNotes", label: "Vendor notes", placeholder: "Key vendor contacts and notes for your successor..." },
    { key: "budgetNotes", label: "Budget notes", placeholder: "Account info, budget context, recurring expenses..." },
    { key: "recommendations", label: "Recommendations for successor", placeholder: "Your top 3-5 recommendations for the next person in this role..." },
  ];

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Officer Transition Binder"
        description="Institutional knowledge for seamless officer handoffs"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setTab("mine")}>Create binder</Button>}
      />

      <Tabs
        tabs={[
          { id: "view", label: "All binders", count: binders.length },
          { id: "mine", label: "Create yours" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "view" && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Card key={i} className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
        ) : binders.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="No transition binders yet"
            description="Create your binder before your term ends so the next officer has everything they need."
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setTab("mine")}>Create your binder</Button>}
          />
        ) : (
          <div className="space-y-3">
            {binders.map((b) => (
              <Card
                key={b.id}
                onClick={() => setSelectedBinder(b)}
                className="cursor-pointer hover:border-greek-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{ROLE_LABELS[b.role as keyof typeof ROLE_LABELS] ?? b.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.outgoing_name ?? "Unknown officer"} · {b.semester} {b.year} · Created {formatDate(b.created_at)}
                    </p>
                    {b.recommendations && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">&ldquo;{b.recommendations}&rdquo;</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "mine" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Your binder" description="Fill in as much as you can — this becomes institutional memory." />
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <Select
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                options={BINDER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r }))}
              />
              <Select
                label="Semester"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                options={[{ value: "spring", label: "Spring" }, { value: "fall", label: "Fall" }]}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Year</label>
                <input type="number" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            {SECTIONS.map((section) => (
              <div key={section.key} className="mb-4">
                <Textarea
                  label={section.label}
                  placeholder={section.placeholder}
                  value={form[section.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [section.key]: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
            ))}
            <div className="mb-4">
              <Textarea label="Key deadlines (one per line)" placeholder='Jan 15 – National dues due&#10;Feb 1 – Formal venue deposit' value={form.keyDeadlines} onChange={(e) => setForm({ ...form, keyDeadlines: e.target.value })} className="min-h-[80px]" />
            </div>
            <div className="mb-4">
              <Textarea label="Key contacts (one per line)" placeholder='National HQ: hq@org.org / (800) 555-0000&#10;Advisor: Dr. Smith – jsmith@university.edu' value={form.keyContacts} onChange={(e) => setForm({ ...form, keyContacts: e.target.value })} className="min-h-[80px]" />
            </div>
            <Button onClick={saveBinder} icon={<Save size={14} />} disabled={!form.role}>
              Save binder
            </Button>
          </Card>
        </div>
      )}

      {/* Binder detail modal */}
      <Modal
        open={!!selectedBinder}
        onClose={() => setSelectedBinder(null)}
        title={`${ROLE_LABELS[selectedBinder?.role as keyof typeof ROLE_LABELS] ?? selectedBinder?.role} Binder`}
        description={`${selectedBinder?.outgoing_name ?? "Officer"} · ${selectedBinder?.semester} ${selectedBinder?.year}`}
        size="xl"
        footer={
          <div className="flex gap-2">
            {selectedBinder && (
              <Button
                variant="secondary"
                icon={<Download size={14} />}
                onClick={() => {
                  const html = buildTransitionBinderHtml(selectedBinder, orgName);
                  const role = ROLE_LABELS[selectedBinder.role as keyof typeof ROLE_LABELS] ?? selectedBinder.role;
                  downloadTransitionBinderHtml(`transition-${role}-${selectedBinder.year}.html`, html);
                  toast.success("Binder exported — open in browser and Print to PDF");
                }}
              >
                Export HTML
              </Button>
            )}
            <Button onClick={() => setSelectedBinder(null)}>Close</Button>
          </div>
        }
      >
        {selectedBinder && (
          <div className="ds-page-stack">
            {[
              { label: "Responsibilities", value: selectedBinder.responsibilities },
              { label: "Lessons learned", value: selectedBinder.lessons_learned },
              { label: "Recommendations", value: selectedBinder.recommendations },
            ].filter((s) => s.value).map((section) => (
              <div key={section.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{section.label}</p>
                <div className="whitespace-pre-wrap text-sm text-foreground bg-surface-1 rounded-lg p-4">
                  {section.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
