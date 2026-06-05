"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import { Alert, Button, Card, Input, PageHeader, Select, Textarea } from "@/components/ui";

export default function HardshipRequestPage() {
  const router = useRouter();
  const { orgId, userId } = useOrg();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    requesterName: "",
    requestedAmount: "",
    requestedArrangement: "waiver",
    reason: "",
    additionalContext: "",
    planInstallments: "2",
  });

  async function submit() {
    if (!form.requesterName.trim()) {
      toast.error("Enter the name of the individual requesting the deduction");
      return;
    }
    setSubmitting(true);
    if (!orgId || !userId) { setSubmitting(false); return; }

    const res = await fetch("/api/hardship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        requesterName: form.requesterName.trim(),
        requestedAmount: form.requestedAmount ? parseFloat(form.requestedAmount) : null,
        arrangement: form.requestedArrangement,
        reason: form.reason,
        additionalContext: form.additionalContext || null,
        planInstallments: parseInt(form.planInstallments, 10) || null,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      toast.error((await res.json().catch(() => ({}))).error ?? "Failed to submit request");
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
          <Heart size={24} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Request submitted</h2>
        <p className="text-muted-foreground text-sm">
          Your hardship request has been sent to the treasurer and president. You will be contacted discreetly to discuss options.
        </p>
        <Button onClick={() => router.push("/payments")}>Back to payments</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-1 text-muted-foreground">
          <ChevronLeft size={18} />
        </button>
        <PageHeader title="Hardship request" description="Request dues assistance, payment plan, or waiver" />
      </div>

      <Alert type="info" title="This request is confidential" description="Only the treasurer, president, and advisor will see your request. Your information is never shared publicly within the chapter." />

      <Card>
        <div className="space-y-4">
          <Input
            label="Name of individual requesting deduction *"
            required
            placeholder="Full legal name"
            value={form.requesterName}
            onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
          />
          <Select
            label="What are you requesting?"
            value={form.requestedArrangement}
            onChange={(e) => setForm({ ...form, requestedArrangement: e.target.value })}
            options={[
              { value: "payment_plan", label: "Payment plan (pay in installments)" },
              { value: "reduction", label: "Dues reduction" },
              { value: "waiver", label: "Full dues waiver" },
              { value: "extension", label: "Due date extension" },
              { value: "other", label: "Other arrangement" },
            ]}
          />

          {form.requestedArrangement === "payment_plan" && (
            <Select
              label="Number of installments"
              value={form.planInstallments}
              onChange={(e) => setForm({ ...form, planInstallments: e.target.value })}
              options={[
                { value: "2", label: "2 payments" },
                { value: "3", label: "3 payments" },
                { value: "4", label: "4 payments" },
                { value: "6", label: "6 payments (monthly)" },
              ]}
            />
          )}

          {["reduction", "waiver"].includes(form.requestedArrangement) && (
            <Input
              label="Amount you can contribute ($)"
              type="number"
              placeholder="0.00"
              hint="Leave at 0 for full waiver request"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
            />
          )}

          <Textarea
            label="Reason for request *"
            required
            placeholder="Please briefly explain your situation. You do not need to share sensitive personal details — just enough context for the officer team to evaluate your request."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="min-h-[100px]"
          />

          <Textarea
            label="Additional context (optional)"
            placeholder="Any other information that may help..."
            value={form.additionalContext}
            onChange={(e) => setForm({ ...form, additionalContext: e.target.value })}
          />

          <div className="bg-surface-1 rounded-xl p-3 text-xs text-muted-foreground">
            <p>By submitting, you understand that:</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>This request is handled confidentially by officers</li>
              <li>Approval is at the discretion of the treasurer and president</li>
              <li>All chapter members deserve to participate regardless of financial situation</li>
            </ul>
          </div>

          <Button
            onClick={submit}
            loading={submitting}
            disabled={!form.reason}
            className="w-full"
          >
            Submit hardship request
          </Button>
        </div>
      </Card>
    </div>
  );
}
