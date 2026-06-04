/** AI form scan: schema, prompts, and normalization for vision extraction */

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "checkbox",
  "date",
  "signature",
  "number",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export interface ScannedFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ScannedFormDraft {
  title: string;
  description?: string;
  type: string;
  fields: ScannedFormField[];
}

const FORM_TYPES = new Set([
  "waiver",
  "emergency_contact",
  "code_of_conduct",
  "travel_form",
  "risk_form",
  "recruitment_interest",
  "reimbursement_form",
  "hardship_request",
  "housing_form",
  "event_approval",
  "general",
]);

export const FORM_SCAN_SYSTEM_PROMPT = `You extract structured digital form definitions from photos or scans of paper/PDF forms.
Return ONLY valid JSON matching this schema:
{
  "title": string,
  "description": string (optional, brief),
  "type": one of: waiver, emergency_contact, code_of_conduct, travel_form, risk_form, recruitment_interest, reimbursement_form, hardship_request, housing_form, event_approval, general,
  "fields": [
    {
      "label": string,
      "type": one of: text, textarea, select, checkbox, date, signature, number,
      "required": boolean,
      "options": string[] (only for select),
      "placeholder": string (optional)
    }
  ]
}
Rules:
- Infer every input, checkbox, dropdown, date line, and signature line from the document.
- Use "signature" for signature lines, initials, or "sign here" areas.
- Use "checkbox" for agree/acknowledge boxes or yes/no items.
- Use "select" when the form shows multiple choice options or a labeled dropdown.
- Use "textarea" for large blank areas or multi-line answers.
- Preserve field labels as written on the form (clean up obvious OCR noise).
- Mark fields required when the form shows *, "required", or mandatory language.
- Choose the best matching "type" for the overall form.
- Do not invent fields that are not on the document.
- Order fields top-to-bottom as they appear on the form.`;

function slugId(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return base ? `${base}-${index + 1}` : `field-${index + 1}`;
}

function normalizeFieldType(raw: unknown): FormFieldType {
  const t = String(raw ?? "text").toLowerCase();
  if (FORM_FIELD_TYPES.includes(t as FormFieldType)) return t as FormFieldType;
  if (t.includes("sign")) return "signature";
  if (t.includes("date")) return "date";
  if (t.includes("check") || t === "boolean") return "checkbox";
  if (t.includes("select") || t.includes("dropdown") || t.includes("radio")) return "select";
  if (t.includes("number") || t.includes("phone")) return "number";
  if (t.includes("area") || t.includes("paragraph") || t.includes("long")) return "textarea";
  return "text";
}

export function normalizeScannedForm(raw: unknown): ScannedFormDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const title = String(obj.title ?? "").trim();
  if (!title) return null;

  const fieldsRaw = Array.isArray(obj.fields) ? obj.fields : [];
  const fields: ScannedFormField[] = [];

  fieldsRaw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const f = item as Record<string, unknown>;
    const label = String(f.label ?? "").trim();
    if (!label) return;
    const type = normalizeFieldType(f.type);
    const required = Boolean(f.required);
    const field: ScannedFormField = {
      id: slugId(label, index),
      label,
      type,
      required,
    };
    if (type === "select" && Array.isArray(f.options)) {
      const options = f.options.map((o) => String(o).trim()).filter(Boolean);
      if (options.length) field.options = options;
    }
    const placeholder = String(f.placeholder ?? "").trim();
    if (placeholder) field.placeholder = placeholder;
    fields.push(field);
  });

  if (fields.length === 0) return null;

  const typeRaw = String(obj.type ?? "general").toLowerCase();
  const type = FORM_TYPES.has(typeRaw) ? typeRaw : "general";
  const description = String(obj.description ?? "").trim();

  return {
    title,
    description: description || undefined,
    type,
    fields,
  };
}

export function parseFormScanJson(content: string): ScannedFormDraft | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return normalizeScannedForm(parsed);
  } catch {
    return null;
  }
}
