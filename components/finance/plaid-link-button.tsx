"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";

interface PlaidLinkButtonProps {
  orgId: string;
  onSuccess: (result: {
    transactionCount?: number;
    recentTransactions?: unknown[];
    institutionName?: string;
  }) => void;
  label?: string;
}

export function PlaidLinkButton({ orgId, onSuccess, label = "Connect bank account" }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/plaid/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not start Plaid Link");
      return null;
    }
    setLinkToken(data.linkToken);
    return data.linkToken as string;
  }, [orgId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, publicToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? data.syncError ?? "Bank connection failed");
        return;
      }
      toast.success(`Connected${data.institutionName ? ` to ${data.institutionName}` : ""}. ${data.transactionCount ?? 0} transactions synced.`);
      onSuccess(data);
    },
    onExit: (err) => {
      if (err) toast.error(err.display_message ?? "Plaid Link closed");
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <Button
      loading={loading}
      onClick={async () => {
        if (linkToken && ready) {
          open();
          return;
        }
        const token = await fetchToken();
        if (token && ready) open();
      }}
    >
      {label}
    </Button>
  );
}
