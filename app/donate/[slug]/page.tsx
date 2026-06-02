"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, PageHeader, ProgressBar, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default function PublicDonatePage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ amount: "", donorName: "", donorEmail: "", message: "", isAnonymous: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("philanthropy_campaigns")
        .select("*")
        .eq("public_page_slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      setCampaign(data);
      setLoading(false);
    }
    load();
  }, [supabase, slug]);

  async function donate() {
    if (!campaign || !form.amount) return;
    setSubmitting(true);
    const res = await fetch("/api/philanthropy/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        amount: form.amount,
        donorName: form.donorName,
        donorEmail: form.donorEmail,
        message: form.message,
        isAnonymous: form.isAnonymous,
      }),
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Donation failed");
      return;
    }
    toast.success("Thank you for your donation!");
    setCampaign({ ...campaign, raised_amount: data.raisedAmount });
    setForm({ amount: "", donorName: "", donorEmail: "", message: "", isAnonymous: false });
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!campaign) {
    return <div className="p-8 text-center">Campaign not found.</div>;
  }

  const goal = Number(campaign.goal_amount ?? 0);
  const raised = Number(campaign.raised_amount ?? 0);
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background p-4 flex justify-center">
      <div className="w-full max-w-md space-y-5 py-8">
        <PageHeader title={String(campaign.title)} description={String(campaign.description ?? "")} />
        <Card>
          <p className="text-2xl font-bold">{formatCurrency(raised)}</p>
          {goal > 0 && (
            <ProgressBar value={pct} label={`${pct}% of ${formatCurrency(goal)} goal`} className="mt-3" />
          )}
        </Card>
        <Card className="space-y-3">
          <Input label="Amount ($)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          {!form.isAnonymous && (
            <>
              <Input label="Your name" value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} />
              <Input label="Email" type="email" value={form.donorEmail} onChange={(e) => setForm({ ...form, donorEmail: e.target.value })} />
            </>
          )}
          <Textarea label="Message (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
            Donate anonymously
          </label>
          <Button className="w-full" icon={<Heart size={14} />} loading={submitting} onClick={donate}>
            Donate
          </Button>
        </Card>
      </div>
    </div>
  );
}
