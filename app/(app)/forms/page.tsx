"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, ClipboardList, Download, Eye, FileEdit, Pencil, Plus, ScanLine, Trash2 } from "lucide-react";
import { SortableFormFields, type FormFieldItem } from "@/components/forms/sortable-form-fields";
import { FormCompletionGrid } from "@/components/forms/form-completion-grid";
import { FormResponsesPanel } from "@/components/forms/form-responses-panel";
import { FormScanPanel } from "@/components/forms/form-scan-panel";
import { SignaturePad } from "@/components/forms/signature-pad";
import type { ScannedFormDraft } from "@/lib/form-ai";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card
, EmptyState, Input,
  Modal, PageHeader, Select, StatCard, Tabs,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface FormTemplate {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  type: string;
  fields: FormField[];
  is_required: boolean;
  due_date: string | null;
  created_at: string;
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "signature" | "number";
  required: boolean;
  options?: string[];
  placeholder?: string;
  page?: number;
  showWhen?: { fieldId: string; equals: string | boolean };
}

const FORM_TYPES = [
  { value: "waiver", label: "Waiver" },
  { value: "emergency_contact", label: "Emergency contact" },
  { value: "code_of_conduct", label: "Code of conduct" },
  { value: "travel_form", label: "Travel form" },
  { value: "risk_form", label: "Risk form" },
  { value: "recruitment_interest", label: "Recruitment interest" },
  { value: "reimbursement_form", label: "Reimbursement form" },
  { value: "hardship_request", label: "Hardship request" },
  { value: "housing_form", label: "Housing form" },
  { value: "event_approval", label: "Event approval form" },
  { value: "general", label: "General" },
];

const TEMPLATE_FORMS: Array<{ title: string; type: string; fields: FormField[] }> = [
  {
    title: "Anti-Hazing Acknowledgement",
    type: "code_of_conduct",
    fields: [
      { id: "1", label: "I have read and understand the anti-hazing policy", type: "checkbox", required: true },
      { id: "2", label: "I agree to uphold these standards and report any violations", type: "checkbox", required: true },
      { id: "3", label: "Electronic signature", type: "signature", required: true },
      { id: "4", label: "Date", type: "date", required: true },
    ],
  },
  {
    title: "Emergency Contact Form",
    type: "emergency_contact",
    fields: [
      { id: "1", label: "Emergency contact name", type: "text", required: true, placeholder: "Full name" },
      { id: "2", label: "Relationship", type: "select", required: true, options: ["Parent", "Guardian", "Sibling", "Spouse", "Friend", "Other"] },
      { id: "3", label: "Phone number", type: "text", required: true, placeholder: "+1 (555) 000-0000" },
      { id: "4", label: "Email (optional)", type: "text", required: false, placeholder: "email@example.com" },
      { id: "5", label: "Medical conditions or allergies to note", type: "textarea", required: false },
    ],
  },
  {
    title: "Travel Authorization Form",
    type: "travel_form",
    fields: [
      { id: "1", label: "Trip destination", type: "text", required: true },
      { id: "2", label: "Travel dates", type: "text", required: true, placeholder: "March 15-17, 2025" },
      { id: "3", label: "I authorize travel on behalf of the organization", type: "checkbox", required: true },
      { id: "4", label: "Emergency contact for this trip", type: "text", required: true },
      { id: "5", label: "Emergency contact phone", type: "text", required: true },
      { id: "6", label: "Signature", type: "signature", required: true },
    ],
  },
];

export default function FormsPage() {
  const { orgId } = useOrg();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("forms");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<FormTemplate | null>(null);
  const [responseTotal, setResponseTotal] = useState(0);
  const [reminding, setReminding] = useState(false);

  const [newForm, setNewForm] = useState({
    title: "", type: "general", description: "",
    isRequired: false, dueDate: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/forms?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) {
      setForms((await res.json()) as FormTemplate[]);
    }
    const respRes = await fetch(`/api/forms/responses?org_id=${encodeURIComponent(oid)}`);
    if (respRes.ok) {
      const json = await respRes.json();
      setResponseTotal(json.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  function addField() {
    setFields((prev) => [...prev, {
      id: String(Date.now()),
      label: "",
      type: "text",
      required: false,
    }]);
  }

  function openEditForm(form: FormTemplate) {
    setEditingFormId(form.id);
    setNewForm({
      title: form.title,
      type: form.type,
      description: form.description ?? "",
      isRequired: form.is_required,
      dueDate: form.due_date?.slice(0, 10) ?? "",
    });
    setFields(form.fields);
    setCreateOpen(true);
  }

  async function exportResponses(form: FormTemplate) {
    if (!orgId) return;
    const res = await fetch(
      `/api/forms/responses?org_id=${encodeURIComponent(orgId)}&form_id=${encodeURIComponent(form.id)}&export=csv`,
    );
    if (!res.ok) {
      toast.error("Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Responses exported");
  }

  async function remindMissing(formId?: string) {
    if (!orgId) return;
    setReminding(true);
    const res = await fetch("/api/forms/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, formId }),
    });
    const data = await res.json();
    setReminding(false);
    if (res.ok) toast.success(data.message ?? "Reminders sent");
    else toast.error(data.error ?? "Reminder failed");
  }

  function applyScannedDraft(draft: ScannedFormDraft) {
    setNewForm({
      title: draft.title,
      type: draft.type,
      description: draft.description ?? "",
      isRequired: false,
      dueDate: "",
    });
    setFields(draft.fields);
    setTab("forms");
    setCreateOpen(true);
  }

  async function saveForm() {
    if (!orgId || !newForm.title || fields.length === 0) return;
    const payload = {
      orgId,
      title: newForm.title,
      type: newForm.type,
      description: newForm.description,
      fields,
      isRequired: newForm.isRequired,
      dueDate: newForm.dueDate,
      ...(editingFormId ? { id: editingFormId } : {}),
    };
    const res = await fetch("/api/forms", {
      method: editingFormId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Failed to save form"); return; }
    toast.success(editingFormId ? "Form updated" : "Form created");
    setCreateOpen(false);
    setEditingFormId(null);
    setNewForm({ title: "", type: "general", description: "", isRequired: false, dueDate: "" });
    setFields([]);
    load(orgId);
  }

  async function createFromTemplate(template: typeof TEMPLATE_FORMS[0]) {
    if (!orgId) return;
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: template.title,
        type: template.type,
        fields: template.fields,
        isRequired: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
    toast.success(`"${template.title}" created from template`);
    load(orgId);
  }

  async function deleteForm(id: string) {
    if (!confirm("Delete this form?")) return;
    const res = await fetch(`/api/forms?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Delete failed");
      return;
    }
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  const required = forms.filter((f) => f.is_required);

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Forms & Signatures"
        description="Build and manage waivers, consent forms, and required documents"
        action={
          <div className="flex gap-2 flex-wrap">
            {required.length > 0 && (
              <Button size="sm" variant="secondary" loading={reminding} icon={<Bell size={14} />} onClick={() => remindMissing()}>
                Remind missing
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={<ScanLine size={14} />} onClick={() => setTab("scan")}>
              Scan with AI
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingFormId(null); setFields([]); setCreateOpen(true); }}>
              Build form
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Active forms" value={forms.length} icon={<ClipboardList size={18} />} />
        <StatCard title="Required forms" value={required.length} icon={<ClipboardList size={18} />} />
        <StatCard title="Responses" value={responseTotal} icon={<ClipboardList size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "forms", label: "My forms", count: forms.length },
          { id: "completion", label: "Completion" },
          { id: "responses", label: "Responses" },
          { id: "scan", label: "Scan with AI" },
          { id: "templates", label: "Templates" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "forms" && (
        loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-14 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
        ) : forms.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="No forms yet"
            description="Build custom forms or start from a template."
            action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Build form</Button>}
          />
        ) : (
          <div className="space-y-2">
            {forms.map((form) => (
              <Card key={form.id} padding="sm">
                <div className="flex items-center gap-3">
                  <ClipboardList size={16} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{form.title}</p>
                      {form.is_required && <Badge label="Required" color="green" />}
                      <Badge label={form.type.replace(/_/g, " ")} color="gray" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.fields.length} field{form.fields.length !== 1 ? "s" : ""} · Created {formatDate(form.created_at)}
                      {form.due_date ? ` · Due ${formatDate(form.due_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => exportResponses(form)} className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground" title="Export responses">
                      <Download size={14} />
                    </button>
                    {form.is_required && (
                      <button onClick={() => remindMissing(form.id)} className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground" title="Remind missing">
                        <Bell size={14} />
                      </button>
                    )}
                    <Link href={`/forms/${form.id}/fill`} className="p-1.5 rounded-md hover:bg-greek-50 text-greek-600" title="Fill form">
                      <FileEdit size={14} />
                    </Link>
                    <button onClick={() => openEditForm(form)} className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground" title="Edit form">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setPreviewForm(form)} className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => deleteForm(form.id)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "completion" && orgId && <FormCompletionGrid orgId={orgId} />}

      {tab === "responses" && orgId && <FormResponsesPanel orgId={orgId} forms={forms} />}

      {tab === "scan" && (
        <FormScanPanel
          orgId={orgId}
          onApplyToBuilder={applyScannedDraft}
          onSaved={() => orgId && load(orgId)}
        />
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Start from a pre-built template. You can customize after creating.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TEMPLATE_FORMS.map((template) => (
              <Card key={template.title} padding="sm" className="hover:border-greek-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{template.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.fields.length} fields · {template.type.replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.fields.slice(0, 3).map((f) => (
                        <span key={f.id} className="text-[10px] bg-surface-2 rounded px-1.5 py-0.5 text-muted-foreground">{f.label}</span>
                      ))}
                      {template.fields.length > 3 && <span className="text-[10px] text-muted-foreground">+{template.fields.length - 3} more</span>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => createFromTemplate(template)}>Use</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Build form modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditingFormId(null); }}
        title={editingFormId ? "Edit form" : "Build form"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveForm} disabled={!newForm.title || fields.length === 0}>Save form</Button>
          </>
        }
      >
        <div className="forms-builder-shell">
          <aside className="forms-builder-settings">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Form settings</p>
            <div className="space-y-3">
              <Input label="Form title *" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Anti-Hazing Acknowledgement" />
              <Select label="Form type" value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} options={FORM_TYPES} />
              <Input label="Due date (optional)" type="date" value={newForm.dueDate} onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })} />
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input type="checkbox" className="rounded" checked={newForm.isRequired} onChange={(e) => setNewForm({ ...newForm, isRequired: e.target.checked })} />
                <span className="text-sm">Required for all members</span>
              </label>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                {fields.length} field{fields.length !== 1 ? "s" : ""} · Drag to reorder on the right
              </p>
            </div>
          </aside>
          <div className="forms-builder-fields">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Questions</p>
            <SortableFormFields
              fields={fields as FormFieldItem[]}
              onChange={(next) => setFields(next as FormField[])}
              onAdd={addField}
            />
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!previewForm}
        onClose={() => setPreviewForm(null)}
        title={previewForm?.title ?? ""}
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            {previewForm && (
              <Button variant="secondary" icon={<Download size={14} />} onClick={() => exportResponses(previewForm)}>
                Export CSV
              </Button>
            )}
            <Button onClick={() => setPreviewForm(null)} className="ml-auto">Close preview</Button>
          </div>
        }
      >
        {previewForm && (
          <div className="space-y-4">
            {previewForm.description && <p className="text-sm text-muted-foreground">{previewForm.description}</p>}
            {previewForm.fields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" placeholder={field.placeholder} disabled />
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2"><input type="checkbox" disabled /><span className="text-sm">I agree</span></label>
                ) : field.type === "signature" ? (
                  <SignaturePad value="" onChange={() => {}} disabled />
                ) : field.type === "select" ? (
                  <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm" disabled>
                    {field.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" placeholder={field.placeholder} disabled />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
