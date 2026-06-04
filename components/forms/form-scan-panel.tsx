"use client";

import { useRef, useState } from "react";
import { ScanLine, Sparkles, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, Input, Select } from "@/components/ui";
import type { ScannedFormDraft } from "@/lib/form-ai";

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

interface FormScanPanelProps {
  orgId: string | null;
  onApplyToBuilder: (draft: ScannedFormDraft) => void;
  onSaved?: () => void;
}

export function FormScanPanel({ orgId, onApplyToBuilder, onSaved }: FormScanPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hints, setHints] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ScannedFormDraft | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [editMeta, setEditMeta] = useState({ title: "", type: "general", description: "" });

  function onPick(selected: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setDraft(null);
    setDisclaimer(null);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  }

  async function runScan() {
    if (!file) {
      toast.error("Choose a photo of the form first");
      return;
    }
    setScanning(true);
    setDraft(null);
    const body = new FormData();
    body.append("file", file);
    if (hints.trim()) body.append("hints", hints.trim());

    const res = await fetch("/api/forms/scan", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setScanning(false);

    if (!res.ok) {
      toast.error(data.error ?? "Scan failed");
      return;
    }

    const scanned = data.draft as ScannedFormDraft;
    setDraft(scanned);
    setDisclaimer(data.disclaimer ?? null);
    setEditMeta({
      title: scanned.title,
      type: scanned.type,
      description: scanned.description ?? "",
    });
    toast.success(`Detected ${scanned.fields.length} fields`);
  }

  async function saveDirectly() {
    if (!orgId || !draft) return;
    setSaving(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: editMeta.title || draft.title,
        type: editMeta.type || draft.type,
        description: editMeta.description || draft.description,
        fields: draft.fields,
        isRequired: false,
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save form");
      return;
    }
    toast.success("Form created from scan");
    onSaved?.();
    setFile(null);
    setDraft(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function applyToBuilder() {
    if (!draft) return;
    onApplyToBuilder({
      ...draft,
      title: editMeta.title || draft.title,
      type: editMeta.type || draft.type,
      description: editMeta.description || draft.description,
    });
    toast.success("Loaded into form builder — review fields before saving");
  }

  return (
    <div className="space-y-4">
      <Card padding="sm" className="border-dashed">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 space-y-3 w-full">
            <p className="text-sm text-muted-foreground">
              Upload a photo or screenshot of a paper form. AI will detect fields, checkboxes, and signature lines and build a digital form you can edit.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<Upload size={14} />}
                onClick={() => inputRef.current?.click()}
              >
                {file ? "Change image" : "Upload image"}
              </Button>
              <Button
                size="sm"
                icon={<Sparkles size={14} />}
                loading={scanning}
                disabled={!file}
                onClick={runScan}
              >
                Scan with AI
              </Button>
            </div>
            <Input
              label="Hints (optional)"
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              placeholder="e.g. This is our 2025 anti-hazing form"
            />
          </div>
          {previewUrl && (
            <div className="w-full sm:w-48 flex-shrink-0 rounded-lg border border-border overflow-hidden bg-surface-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Form preview" className="w-full h-auto max-h-40 object-contain" />
            </div>
          )}
        </div>
      </Card>

      {draft && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-greek-600" />
            <p className="font-semibold text-sm">Extracted form</p>
          </div>
          {disclaimer && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {disclaimer}
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Title"
              value={editMeta.title}
              onChange={(e) => setEditMeta((m) => ({ ...m, title: e.target.value }))}
            />
            <Select
              label="Type"
              value={editMeta.type}
              onChange={(e) => setEditMeta((m) => ({ ...m, type: e.target.value }))}
              options={FORM_TYPES}
            />
          </div>
          <Input
            label="Description"
            value={editMeta.description}
            onChange={(e) => setEditMeta((m) => ({ ...m, description: e.target.value }))}
          />
          <ul className="space-y-1 max-h-48 overflow-y-auto text-sm border border-border rounded-lg p-3 bg-surface-1">
            {draft.fields.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span>
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">{f.type}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={applyToBuilder}>
              Edit in builder
            </Button>
            <Button size="sm" loading={saving} disabled={!orgId} onClick={saveDirectly}>
              Save form now
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
