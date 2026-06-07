"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { SignaturePad } from "@/components/forms/signature-pad";
import { Button, Card, PageHeader } from "@/components/ui";
import { groupFieldsByPage, isFieldVisible } from "@/lib/form-conditions";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  page?: number;
  showWhen?: { fieldId: string; equals: string | boolean };
}

interface FormTemplate {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  is_required: boolean;
}

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch(`/api/forms/${formId}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { form: f, alreadySubmitted: submitted } = await res.json();
    if (!f) {
      setLoading(false);
      return;
    }
    setForm(f as FormTemplate);
    setAlreadySubmitted(Boolean(submitted));
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleFields = useMemo(() => {
    if (!form) return [];
    return form.fields.filter((field) => isFieldVisible(field, answers));
  }, [form, answers]);

  const pages = useMemo(() => {
    const grouped = groupFieldsByPage(visibleFields);
    return Array.from(grouped.keys()).sort((a, b) => a - b);
  }, [visibleFields]);

  const totalPages = pages.length || 1;
  const pageFields = useMemo(
    () => visibleFields.filter((f) => (f.page ?? 1) === (pages[currentPage - 1] ?? 1)),
    [visibleFields, pages, currentPage],
  );

  function setAnswer(fieldId: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function primarySignature(): string | undefined {
    if (!form) return undefined;
    for (const field of form.fields) {
      if (field.type === "signature") {
        const val = answers[field.id];
        if (typeof val === "string" && val.startsWith("data:image")) return val;
      }
    }
    return undefined;
  }

  function validateFields(fields: FormField[]): boolean {
    for (const field of fields) {
      if (!field.required) continue;
      if (field.type === "signature") {
        const sig = answers[field.id];
        if (typeof sig !== "string" || !sig.startsWith("data:image")) {
          toast.error(`Please sign: ${field.label}`);
          return false;
        }
        continue;
      }
      const val = answers[field.id];
      if (val === undefined || val === "" || val === false) {
        toast.error(`Please complete: ${field.label}`);
        return false;
      }
    }
    return true;
  }

  async function submit() {
    if (!form) return;
    if (!validateFields(visibleFields)) return;

    const signature = primarySignature();

    setSubmitting(true);
    const res = await fetch("/api/forms/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: form.id,
        responses: answers,
        signature,
      }),
    });
    setSubmitting(false);

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Submission failed");
      return;
    }
    toast.success("Form submitted successfully");
    router.push("/forms");
    router.refresh();
  }

  function nextPage() {
    if (!validateFields(pageFields)) return;
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
    else void submit();
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading form...</div>;
  }

  if (!form) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Form not found.</p>
        <Link href="/forms" className="text-greek-600 text-sm mt-2 inline-block">Back to forms</Link>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="space-y-4">
        <Link href="/forms" className="inline-flex items-center gap-1 text-sm text-greek-600 hover:underline">
          <ArrowLeft size={14} /> Back to forms
        </Link>
        <Card>
          <p className="font-semibold">Already submitted</p>
          <p className="text-sm text-muted-foreground mt-1">You have already completed &quot;{form.title}&quot;.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <Link href="/forms" className="inline-flex items-center gap-1 text-sm text-greek-600 hover:underline">
        <ArrowLeft size={14} /> Back to forms
      </Link>
      <PageHeader
        title={form.title}
        description={form.description ?? "Complete all required fields and submit."}
      />

      {totalPages > 1 && (
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      )}

      <Card className="space-y-4">
        {pageFields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={field.placeholder}
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={Boolean(answers[field.id])}
                  onChange={(e) => setAnswer(field.id, e.target.checked)}
                />
                <span className="text-sm">I agree</span>
              </label>
            ) : field.type === "signature" ? (
              <SignaturePad
                value={typeof answers[field.id] === "string" ? String(answers[field.id]) : ""}
                onChange={(dataUrl) => setAnswer(field.id, dataUrl)}
              />
            ) : field.type === "select" ? (
              <select
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              >
                <option value="">Select...</option>
                {field.options?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={field.placeholder}
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          {currentPage > 1 && (
            <Button variant="secondary" onClick={() => setCurrentPage((p) => p - 1)}>
              Back
            </Button>
          )}
          <Button
            className="flex-1"
            loading={submitting}
            onClick={nextPage}
            icon={<ClipboardList size={14} />}
          >
            {currentPage < totalPages ? "Next page" : "Submit form"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
