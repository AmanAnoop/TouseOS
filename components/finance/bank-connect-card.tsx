"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PlaidLinkButton } from "@/components/finance/plaid-link-button";

const SUPPORTED_BANKS = ["Chase", "Bank of America", "Wells Fargo", "US Bank", "PNC", "+12,000 more"];

interface BankStatus {
  plaidConfigured: boolean;
  connected: boolean;
  status: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
  balanceCurrent: number | null;
  needsReconnect: boolean;
}

interface BankConnectCardProps {
  orgId: string;
  variant?: "hero" | "compact" | "inline";
  onConnected?: () => void;
}

export function BankConnectCard({ orgId, variant = "hero", onConnected }: BankConnectCardProps) {
  const [status, setStatus] = useState<BankStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/bank-status?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSuccess = () => {
    load();
    onConnected?.();
  };

  if (loading && !status) {
    return (
      <Card padding="sm" className="animate-pulse">
        <div className="h-24 rounded-lg bg-muted/30" />
      </Card>
    );
  }

  if (!status?.plaidConfigured) {
    return (
      <Card padding="sm">
        <p className="text-sm text-muted-foreground">
          Bank connections are not enabled on this server yet. Ask your admin to set{" "}
          <code className="text-xs">PLAID_CLIENT_ID</code> and <code className="text-xs">PLAID_SECRET</code>.
        </p>
      </Card>
    );
  }

  if (status.connected && !status.needsReconnect) {
    const compact = variant === "compact" || variant === "inline";
    return (
      <Card padding={compact ? "sm" : "md"} className={variant === "inline" ? "border-green-200/40 dark:border-green-900/40" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--color-bg-subtle)" }}
            >
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">
                  {status.institutionName ?? "Chapter bank"}
                </p>
                <Badge label="Connected" color="green" dot />
              </div>
              {status.balanceCurrent != null && (
                <p className="text-lg font-medium mt-1 tabular-nums">
                  {formatCurrency(Number(status.balanceCurrent))}
                  <span className="text-sm font-normal text-muted-foreground ml-2">current balance</span>
                </p>
              )}
              {status.lastSyncedAt && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Last synced {formatDate(status.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>
          <PlaidLinkButton orgId={orgId} label="Update connection" onSuccess={handleSuccess} />
        </div>
      </Card>
    );
  }

  const steps = [
    { n: "1", text: "Click connect — Plaid opens securely in-app" },
    { n: "2", text: "Search your bank (Chase, BofA, credit unions, etc.)" },
    { n: "3", text: "Sign in once — we import ~90 days of transactions" },
  ];

  if (variant === "compact") {
    return (
      <Card padding="sm">
        <p className="font-medium text-sm mb-2">Chapter checking account</p>
        <p className="text-xs text-muted-foreground mb-3">
          Read-only sync for balances and budget tracking. Takes about 2 minutes.
        </p>
        <PlaidLinkButton orgId={orgId} size="lg" label="Connect bank account" onSuccess={handleSuccess} />
      </Card>
    );
  }

  return (
    <Card padding="md" className="overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top right, var(--color-org-primary), transparent 60%)",
        }}
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-label mb-2">Chapter finances</p>
            <h2 className="type-h1" style={{ margin: 0 }}>
              {status.needsReconnect ? "Reconnect your bank" : "Connect your chapter bank"}
            </h2>
            <p className="type-body text-muted-foreground mt-2 max-w-xl">
              Link your organization&apos;s checking account in a few clicks. We only <strong>read</strong> balances
              and transactions — we never move money. Perfect for treasurers tracking semester budgets.
            </p>
          </div>
          {status.needsReconnect && <Badge label="Connection expired" color="yellow" />}
        </div>

        <div className="flex flex-wrap gap-2">
          {SUPPORTED_BANKS.map((b) => (
            <span
              key={b}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-background/80 text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex gap-3 rounded-lg border border-border p-3 bg-[var(--color-bg-subtle)]"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--color-org-primary)", color: "var(--color-text-on-brand)" }}
              >
                {s.n}
              </span>
              <p className="text-sm text-foreground leading-snug">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-4">
          <PlaidLinkButton
            orgId={orgId}
            size="lg"
            label={status.needsReconnect ? "Reconnect bank account" : "Connect bank account"}
            onSuccess={handleSuccess}
          />
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Bank-grade encryption
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Read-only access
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
