"use client";

import { useEffect, useState } from "react";
import { CreditCard, Heart, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Input } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ParentPayData {
  paid: boolean;
  paymentId?: string;
  orgName?: string;
  title?: string;
  memberName?: string;
  checkoutAmount?: number;
  amount?: number;
  paidAmount?: number;
  dueDate?: string | null;
  status?: string;
  stripeReady?: boolean;
  stripeMessage?: string;
}

export function ParentPayClient({ token }: { token: string }) {
  const [data, setData] = useState<ParentPayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/payments/parent?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Payment link not found");
        setData(null);
      } else {
        setData(json);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast.error(json.error ?? "Could not start checkout");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1 p-6">
        <Card className="w-full max-w-md h-48 animate-pulse">&nbsp;</Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1 p-6">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="font-semibold text-foreground">This payment link is invalid or expired.</p>
          <p className="text-sm text-muted-foreground mt-2">Ask your student or chapter treasurer for a new link.</p>
        </Card>
      </div>
    );
  }

  if (data.paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1 p-6">
        <Card className="w-full max-w-md p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto">
            <Heart size={24} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold">Already paid</h1>
          <p className="text-sm text-muted-foreground">
            {data.memberName}&apos;s payment to {data.orgName} is complete. Thank you!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-greek-50 to-background dark:from-greek-950/20 p-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <Badge label="Parent / guardian pay" color="blue" />
          <h1 className="text-2xl font-bold mt-3 text-foreground">{data.orgName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.title}</p>
        </div>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield size={16} />
            Paying on behalf of <span className="font-medium text-foreground">{data.memberName}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-1">
              <p className="text-xs text-muted-foreground">Amount due</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(data.checkoutAmount ?? 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-1">
              <p className="text-xs text-muted-foreground">Due date</p>
              <p className="text-sm font-medium">{data.dueDate ? formatDate(data.dueDate) : "—"}</p>
            </div>
          </div>

          {data.status === "overdue" && (
            <p className="text-xs text-red-500 font-medium">This balance is past due. Late fees may apply.</p>
          )}

          {data.stripeReady === false && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              {data.stripeMessage ?? "Online card payments are not available yet. Ask the chapter treasurer to connect Stripe."}
            </p>
          )}

          <Input
            label="Your email (for receipt)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@email.com"
            disabled={data.stripeReady === false}
          />

          <Button
            className="w-full"
            size="lg"
            icon={<CreditCard size={16} />}
            loading={paying}
            onClick={pay}
            disabled={(data.checkoutAmount ?? 0) <= 0 || data.stripeReady === false}
          >
            Pay {formatCurrency(data.checkoutAmount ?? 0)} securely
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Payments are processed by Stripe. TouseOS does not store card numbers.
          </p>
        </Card>
      </div>
    </div>
  );
}
