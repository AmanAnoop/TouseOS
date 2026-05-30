"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, ExternalLink, Heart, Plus, QrCode, Share2, Target, Trophy, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, EmptyState,
  Modal, Input, PageHeader, ProgressBar, StatCard, Textarea,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PhilanthropyCampaign } from "@/types";

export default function PhilanthropyPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<PhilanthropyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", goalAmount: "",
    beneficiary: "", startDate: "", endDate: "",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase.from("philanthropy_campaigns").select("*").eq("org_id", oid).order("created_at", { ascending: false });
    setCampaigns((data ?? []) as PhilanthropyCampaign[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  async function createCampaign() {
    if (!orgId || !form.title) return;
    const { error } = await supabase.from("philanthropy_campaigns").insert({
      org_id: orgId,
      title: form.title,
      description: form.description || null,
      goal_amount: form.goalAmount ? parseFloat(form.goalAmount) : null,
      beneficiary: form.beneficiary || null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign created!");
    setCreateOpen(false);
    setForm({ title: "", description: "", goalAmount: "", beneficiary: "", startDate: "", endDate: "" });
    load(orgId);
  }

  const totalRaised = campaigns.reduce((s, c) => s + Number(c.raised_amount ?? 0), 0);
  const totalGoal = campaigns.reduce((s, c) => s + Number(c.goal_amount ?? 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.is_active);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Philanthropy & Fundraising"
        description={`${campaigns.length} campaigns · ${formatCurrency(totalRaised)} raised total`}
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New campaign</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active campaigns" value={activeCampaigns.length} icon={<Heart size={18} />} />
        <StatCard title="Total raised" value={formatCurrency(totalRaised)} deltaType="up" icon={<DollarSign size={18} />} />
        <StatCard title="Goal amount" value={totalGoal > 0 ? formatCurrency(totalGoal) : "—"} icon={<Target size={18} />} />
        <StatCard title="Success rate" value={totalGoal > 0 ? `${Math.round((totalRaised / totalGoal) * 100)}%` : "—"} icon={<Trophy size={18} />} />
      </div>

      {totalGoal > 0 && (
        <Card>
          <CardHeader title="Overall fundraising progress" />
          <ProgressBar value={Math.round((totalRaised / totalGoal) * 100)} label={`${formatCurrency(totalRaised)} raised of ${formatCurrency(totalGoal)} goal`} color={totalRaised >= totalGoal ? "green" : "blue"} size="md" />
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">{[1,2].map((i) => <Card key={i} className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Heart size={24} />}
          title="No campaigns yet"
          description="Create a donation page or fundraising campaign for your next philanthropy event."
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Start a campaign</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const pct = campaign.goal_amount ? Math.min(100, Math.round((Number(campaign.raised_amount) / Number(campaign.goal_amount)) * 100)) : null;
            return (
              <Card key={campaign.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground">{campaign.title}</p>
                      <Badge label={campaign.is_active ? "Active" : "Ended"} color={campaign.is_active ? "green" : "gray"} dot />
                    </div>
                    {campaign.beneficiary && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Heart size={11} className="text-pink-500" />
                        Beneficiary: {campaign.beneficiary}
                      </p>
                    )}
                    {campaign.end_date && <p className="text-xs text-muted-foreground">Ends {formatDate(campaign.end_date)}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-foreground">{formatCurrency(Number(campaign.raised_amount))}</p>
                    {campaign.goal_amount && (
                      <p className="text-xs text-muted-foreground">of {formatCurrency(Number(campaign.goal_amount))}</p>
                    )}
                  </div>
                </div>

                {pct !== null && (
                  <ProgressBar value={pct} color={pct >= 100 ? "green" : pct >= 50 ? "blue" : "yellow"} label={`${pct}% of goal`} size="md" />
                )}

                {campaign.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{campaign.description}</p>
                )}

                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" icon={<Share2 size={12} />} className="flex-1">Share link</Button>
                  <Button variant="secondary" size="sm" icon={<QrCode size={12} />}>QR code</Button>
                  {campaign.is_active && (
                    <Button size="sm" icon={<DollarSign size={12} />} className="flex-1 bg-green-600 hover:bg-green-700">Donate</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fundraising toolkit */}
      <Card>
        <CardHeader title="Fundraising toolkit" description="Templates and resources for campaigns" />
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "Social media templates", description: "Instagram posts, stories, and captions for fundraising", icon: "📸" },
            { title: "Email outreach templates", description: "Alumni and parent donation request templates", icon: "📧" },
            { title: "Sponsorship packages", description: "Tiered sponsor packages for events", icon: "🤝" },
            { title: "Impact report template", description: "Show donors where the money went", icon: "📊" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors cursor-pointer">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create campaign"
        description="Set up a fundraising page or donation link."
        size="md"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createCampaign} disabled={!form.title}>Create</Button></>}
      >
        <div className="space-y-4">
          <Input label="Campaign title *" placeholder="Spring philanthropy drive" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" placeholder="What are you raising money for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Fundraising goal ($)" type="number" placeholder="5000" value={form.goalAmount} onChange={(e) => setForm({ ...form, goalAmount: e.target.value })} />
            <Input label="Beneficiary" placeholder="Organization name" value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} />
            <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
