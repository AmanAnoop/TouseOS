"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Alert, Button, Card, Input, Modal,
} from "@/components/ui";
import { BankConnectCard } from "@/components/finance/bank-connect-card";
import { DEFAULT_BUDGET_CATEGORIES } from "@/lib/finance-categories";

type SetupPath = "stripe" | "plaid" | "both" | "manual";

interface SetupWizardProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  stripeConnected?: boolean;
  stripeChargesEnabled?: boolean;
}

export function FinanceSetupWizard({
  orgId,
  open,
  onClose,
  onComplete,
  stripeConnected,
  stripeChargesEnabled,
}: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<SetupPath | null>(null);
  const [plaidDone, setPlaidDone] = useState(false);
  const [stripeDone, setStripeDone] = useState(Boolean(stripeConnected && stripeChargesEnabled));
  const [importRoster, setImportRoster] = useState(true);
  const [form, setForm] = useState({
    semesterLabel: "Current semester",
    semesterDuesAmount: "",
    semesterDuesDueDate: "",
    totalBudgetTarget: "",
    lateFeeAmount: "0",
    lateFeeDays: "14",
    balanceAlertThreshold: "",
  });
  const [saving, setSaving] = useState(false);
  const [categorizePreview, setCategorizePreview] = useState<Array<{
    id: string;
    description?: string;
    merchant_name?: string;
    amount: number;
    pending_review?: boolean;
  }>>([]);

  const steps = useMemo(() => {
    if (!path) return ["Choose setup"];
    if (path === "manual") return ["Choose setup", "Budget structure"];
    if (path === "stripe") return ["Choose setup", "Stripe Connect", "Budget structure"];
    if (path === "plaid") return ["Choose setup", "Bank (Plaid)", "Review transactions", "Budget structure"];
    return ["Choose setup", "Stripe & bank", "Review transactions", "Budget structure"];
  }, [path]);

  async function saveSetup(partial: Record<string, unknown>, complete = false) {
    setSaving(true);
    const res = await fetch("/api/finance/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        setupPath: path,
        semesterLabel: form.semesterLabel,
        semesterDuesAmount: form.semesterDuesAmount ? Number(form.semesterDuesAmount) : undefined,
        semesterDuesDueDate: form.semesterDuesDueDate || undefined,
        totalBudgetTarget: form.totalBudgetTarget ? Number(form.totalBudgetTarget) : undefined,
        lateFeeAmount: Number(form.lateFeeAmount) || 0,
        lateFeeDaysAfterDue: Number(form.lateFeeDays) || 14,
        balanceAlertThreshold: form.balanceAlertThreshold
          ? Number(form.balanceAlertThreshold)
          : undefined,
        importRoster: complete && importRoster,
        complete,
        ...partial,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Setup save failed");
      return false;
    }
    return true;
  }

  async function startStripeOnboarding() {
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Stripe Connect unavailable");
      return;
    }
    if (data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Complete Stripe in the new tab, then click “Check status”.");
    }
  }

  async function refreshStripeStatus() {
    const res = await fetch(`/api/stripe/connect?org_id=${encodeURIComponent(orgId)}`);
    const data = await res.json().catch(() => ({}));
    if (data.chargesEnabled && data.detailsSubmitted) {
      setStripeDone(true);
      toast.success("Stripe Connect is ready.");
    } else {
      toast.error("Stripe onboarding is not complete yet.");
    }
  }

  function renderBody() {
    if (step === 0) {
      return (
        <div className="space-y-3">
          {([
            { id: "plaid" as const, title: "Connect chapter bank account", desc: "Fastest start — balances & transactions in ~2 minutes (recommended)." },
            { id: "both" as const, title: "Bank + collect dues", desc: "Plaid for your checking account and Stripe for member payments." },
            { id: "stripe" as const, title: "Collect dues only", desc: "Stripe Connect — money goes directly to your chapter account." },
            { id: "manual" as const, title: "Set up manually", desc: "Classic budget editor without bank or Stripe automation." },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`w-full text-left rounded-lg border p-4 ${path === opt.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              onClick={() => setPath(opt.id)}
            >
              <p className="font-medium">{opt.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      );
    }

    const connectStep = path === "manual" ? -1 : 1;
    const reviewStep = path === "plaid" || path === "both" ? 2 : -1;
    const budgetStep = steps.length - 1;

    if (step === connectStep && path === "plaid") {
      return (
        <BankConnectCard
          orgId={orgId}
          variant="compact"
          onConnected={() => {
            setPlaidDone(true);
            setStep(2);
          }}
        />
      );
    }

    if (step === connectStep && path !== "manual") {
      const needsStripe = path === "stripe" || path === "both";
      const needsPlaid = path === "both";
      return (
        <div className="space-y-4">
          {needsPlaid && (
            <BankConnectCard
              orgId={orgId}
              variant="compact"
              onConnected={() => {
                setPlaidDone(true);
                setCategorizePreview([]);
              }}
            />
          )}
          {needsStripe && (
            <div className="space-y-2">
              <Alert type="info" title="Stripe Connect" description="TouseOS never holds chapter funds. Optional platform fee may apply per deployment." />
              <div className="flex flex-wrap gap-2">
                <Button onClick={startStripeOnboarding}>Start onboarding</Button>
                <Button variant="secondary" onClick={refreshStripeStatus}>Check status</Button>
              </div>
              {stripeDone && <p className="text-sm text-green-600 dark:text-green-400">Stripe ready.</p>}
            </div>
          )}
          {needsStripe && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={importRoster} onChange={(e) => setImportRoster(e.target.checked)} />
              Pre-assign semester dues to active roster when finishing
            </label>
          )}
        </div>
      );
    }

    if (step === reviewStep) {
      const flagged = categorizePreview.filter((t) => t.pending_review).length;
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {categorizePreview.length} transactions imported. {flagged > 0 ? `${flagged} flagged for review.` : "All auto-categorized."}
          </p>
          <ul className="max-h-40 overflow-y-auto text-sm border rounded-lg p-2 space-y-1">
            {categorizePreview.slice(0, 10).map((t) => (
              <li key={t.id} className="truncate">{t.merchant_name ?? t.description}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (step === budgetStep) {
      return (
        <div className="space-y-3">
          <Input label="Semester label" value={form.semesterLabel} onChange={(e) => setForm((f) => ({ ...f, semesterLabel: e.target.value }))} />
          <Input label="Dues per member ($)" type="number" value={form.semesterDuesAmount} onChange={(e) => setForm((f) => ({ ...f, semesterDuesAmount: e.target.value }))} />
          <Input label="Due date" type="date" value={form.semesterDuesDueDate} onChange={(e) => setForm((f) => ({ ...f, semesterDuesDueDate: e.target.value }))} />
          <Input label="Semester budget target ($)" type="number" value={form.totalBudgetTarget} onChange={(e) => setForm((f) => ({ ...f, totalBudgetTarget: e.target.value }))} />
          <p className="text-xs text-muted-foreground">
            Categories: {DEFAULT_BUDGET_CATEGORIES.map((c) => c.label).join(", ")}
          </p>
          {path === "manual" && (
            <Link href="/budget" className="text-sm text-primary hover:underline">Open manual budget editor</Link>
          )}
        </div>
      );
    }

    return null;
  }

  function canContinue(): boolean {
    if (step === 0) return path != null;
    if (path === "manual" && step === 1) return true;
    if (path === "stripe" && step === 1) return stripeDone;
    if (path === "plaid" && step === 1) return plaidDone;
    if (path === "both" && step === 1) return stripeDone && plaidDone;
    if ((path === "plaid" || path === "both") && step === 2) return plaidDone;
    return true;
  }

  async function onContinue() {
    if (step === 0 && path) {
      await saveSetup({ setupPath: path });
      setStep(1);
      return;
    }

    const last = steps.length - 1;
    if (step < last) {
      if (path === "stripe" && step === 1 && !stripeDone) {
        toast.error("Complete Stripe onboarding first");
        return;
      }
      if (path === "plaid" && step === 1 && !plaidDone) {
        toast.error("Connect your bank first");
        return;
      }
      if (path === "both" && step === 1 && (!stripeDone || !plaidDone)) {
        toast.error("Complete Stripe and Plaid first");
        return;
      }
      setStep(step + 1);
      return;
    }

    const ok = await saveSetup({}, true);
    if (!ok) return;

    if (form.semesterDuesAmount && path !== "manual") {
      await fetch("/api/finance/dues/launch-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          amount: Number(form.semesterDuesAmount),
          dueDate: form.semesterDuesDueDate || undefined,
          title: form.semesterLabel,
          lateFee: Number(form.lateFeeAmount) || 0,
        }),
      });
    }

    toast.success("Finance setup complete");
    onComplete();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Chapter finance setup" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {steps.length}: {steps[step]}
        </p>
        <Card padding="sm">{renderBody()}</Card>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => (step > 0 ? setStep(step - 1) : onClose())}>
            {step === 0 ? "Later" : "Back"}
          </Button>
          <Button loading={saving} disabled={!canContinue()} onClick={onContinue}>
            {step >= steps.length - 1 ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
