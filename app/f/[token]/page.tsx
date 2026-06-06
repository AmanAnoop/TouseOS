"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { SignaturePad } from "@/components/forms/signature-pad";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormTemplate {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
}

export default function PublicFormPage() {
  const params = useParams();
  const token = params.token as string;
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/forms/share?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const json = await res.json();
    setForm(json.form as FormTemplate);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!form || !name.trim()) {
      toast.error("Enter your name to submit");
      return;
    }
    const missing = form.fields.filter((f) => f.required && (answers[f.id] === undefined || answers[f.id] === ""));
    if (missing.length > 0) {
      toast.error(`Complete required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/forms/responses/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        submitterName: name,
        submitterEmail: email,
        responses: answers,
        signature: typeof answers.signature === "string" ? answers.signature : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Submit failed");
      return;
    }
    setSubmitted(true);
    toast.success("Form submitted — thank you!");
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading form…</div>;
  }

  if (!form) {
    return <div className="p-8 text-center text-muted-foreground">This form link is invalid or has been removed.</div>;
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="text-center p-8">
          <p className="font-semibold text-lg">Response recorded</p>
          <p className="text-sm text-muted-foreground mt-2">Thank you for completing {form.title}.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 ds-page-stack">
      <PageHeader title={form.title} description={form.description ?? "Complete all required fields below."} />
      <Card className="space-y-4 p-4">
        <Input label="Your name *" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {form.fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border px-3 py-2 text-sm"
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
              />
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(answers[field.id])}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.checked })}
                />
                I agree
              </label>
            ) : field.type === "signature" ? (
              <SignaturePad
                value={String(answers[field.id] ?? "")}
                onChange={(v) => setAnswers({ ...answers, [field.id]: v })}
              />
            ) : field.type === "select" ? (
              <select
                className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
              >
                <option value="">Select…</option>
                {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                className="h-9 w-full rounded-lg border border-border px-3 text-sm"
                placeholder={field.placeholder}
                value={String(answers[field.id] ?? "")}
                onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
              />
            )}
          </div>
        ))}
        <Button className="w-full" loading={submitting} onClick={submit}>Submit</Button>
      </Card>
    </div>
  );
}
