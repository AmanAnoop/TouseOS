"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, PageHeader } from "@/components/ui";

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
  const supabase = createClient();
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const load = useCallback(async () => {
    const { data: f } = await supabase.from("forms").select("*").eq("id", formId).single();
    if (!f) {
      setLoading(false);
      return;
    }
    setForm(f as FormTemplate);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && f) {
      const { data: mp } = await supabase
        .from("member_profiles")
        .select("id")
        .eq("org_id", (f as FormTemplate).org_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (mp) {
        const { data: existing } = await supabase
          .from("form_responses")
          .select("id")
          .eq("form_id", formId)
          .eq("member_id", mp.id)
          .maybeSingle();
        setAlreadySubmitted(!!existing);
      }
    }
    setLoading(false);
  }, [supabase, formId]);

  useEffect(() => {
    load();
  }, [load]);

  function setAnswer(fieldId: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function submit() {
    if (!form) return;
    for (const field of form.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === "" || val === false) {
          toast.error(`Please complete: ${field.label}`);
          return;
        }
      }
      if (field.type === "signature" && field.required && !signature.trim()) {
        toast.error("Signature is required");
        return;
      }
    }

    setSubmitting(true);
    const res = await fetch("/api/forms/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: form.id,
        responses: {
          ...answers,
          ...(signature ? { _signature: signature } : {}),
        },
        signature: signature || undefined,
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

      <Card className="space-y-4">
        {form.fields.map((field) => (
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
              <Input
                placeholder="Type your full legal name as signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
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
        <Button className="w-full" loading={submitting} onClick={submit} icon={<ClipboardList size={14} />}>
          Submit form
        </Button>
      </Card>
    </div>
  );
}
