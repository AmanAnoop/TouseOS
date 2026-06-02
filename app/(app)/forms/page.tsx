"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
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
}

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "signature", label: "Signature" },
  { value: "number", label: "Number" },
];

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
  const supabase = createClient();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("forms");
  const [createOpen, setCreateOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<FormTemplate | null>(null);

  const [newForm, setNewForm] = useState({
    title: "", type: "general", description: "",
    isRequired: false, dueDate: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase.from("forms").select("*").eq("org_id", oid).order("created_at", { ascending: false });
    setForms((data ?? []) as FormTemplate[]);
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

  function addField() {
    setFields((prev) => [...prev, {
      id: String(Date.now()),
      label: "",
      type: "text",
      required: false,
    }]);
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function saveForm() {
    if (!orgId || !newForm.title || fields.length === 0) return;
    const { error } = await supabase.from("forms").insert({
      org_id: orgId,
      title: newForm.title,
      type: newForm.type,
      description: newForm.description || null,
      fields: fields,
      is_required: newForm.isRequired,
      due_date: newForm.dueDate || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Form created");
    setCreateOpen(false);
    setNewForm({ title: "", type: "general", description: "", isRequired: false, dueDate: "" });
    setFields([]);
    load(orgId);
  }

  async function createFromTemplate(template: typeof TEMPLATE_FORMS[0]) {
    if (!orgId) return;
    const { error } = await supabase.from("forms").insert({
      org_id: orgId,
      title: template.title,
      type: template.type,
      fields: template.fields,
      is_required: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`"${template.title}" created from template`);
    load(orgId);
  }

  async function deleteForm(id: string) {
    if (!confirm("Delete this form?")) return;
    await supabase.from("forms").delete().eq("id", id);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }

  const required = forms.filter((f) => f.is_required);
  const responses = 0; // Would aggregate from form_responses

  return (
    <div className="space-y-5">
      <PageHeader
        title="Forms & Signatures"
        description="Build and manage waivers, consent forms, and required documents"
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Build form
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Active forms" value={forms.length} icon={<ClipboardList size={18} />} />
        <StatCard title="Required forms" value={required.length} icon={<ClipboardList size={18} />} />
        <StatCard title="Responses" value={responses} icon={<ClipboardList size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "forms", label: "My forms", count: forms.length },
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
        onClose={() => setCreateOpen(false)}
        title="Build form"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveForm} disabled={!newForm.title || fields.length === 0}>Save form</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Form title *" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Anti-Hazing Acknowledgement" />
            <Select label="Form type" value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} options={FORM_TYPES} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Due date (optional)" type="date" value={newForm.dueDate} onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input type="checkbox" className="rounded" checked={newForm.isRequired} onChange={(e) => setNewForm({ ...newForm, isRequired: e.target.checked })} />
              <span className="text-sm">Required for all members</span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Form fields</p>
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={addField}>Add field</Button>
            </div>

            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <ClipboardList size={20} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No fields yet. Add your first field.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-surface-1">
                    <span className="text-xs text-muted-foreground mt-2 w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 grid sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Field label"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                      />
                      <select
                        className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })}
                      >
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                        <span className="text-sm">Required</span>
                      </label>
                    </div>
                    <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-red-500 mt-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!previewForm}
        onClose={() => setPreviewForm(null)}
        title={previewForm?.title ?? ""}
        size="md"
        footer={<Button onClick={() => setPreviewForm(null)}>Close preview</Button>}
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
                  <div className="h-16 border border-border rounded-lg bg-surface-1 flex items-center justify-center text-sm text-muted-foreground">Signature pad</div>
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
