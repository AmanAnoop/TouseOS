"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, Heart, Plus, QrCode, Share2, Target, Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, CardHeader, EmptyState,
  Modal, Input, PageHeader, ProgressBar, StatCard, Textarea,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PhilanthropyCampaign } from "@/types";
import { useOrg } from "@/hooks/use-org";

const TOOLKIT = [
  {
    title: "Social media templates",
    description: "Instagram posts, stories, and captions for fundraising",
    href: "/social-calendar",
    caption: "So proud of our chapter for raising $[amount] for [cause] 🙌 Every dollar makes a difference. Thank you to everyone who contributed! 💚",
  },
  {
    title: "Email outreach templates",
    description: "Alumni and parent donation request templates",
    href: "/comms",
    caption: "Dear [Name], our chapter is raising funds for [beneficiary]. Your support helps us make a real impact. Donate here: [link]",
  },
  {
    title: "Sponsorship packages",
    description: "Tiered sponsor packages for events",
    href: "/social-assets",
    caption: "Gold ($500): logo on banner + social shoutout. Silver ($250): social post. Bronze ($100): thank-you in program.",
  },
  {
    title: "Impact report template",
    description: "Show donors where the money went",
    href: "/reports",
    caption: "This semester we raised $X for [cause], funding Y volunteer hours and Z dollars directly to the beneficiary.",
  },
] as const;

export default function PhilanthropyPage() {
  const { orgId } = useOrg();
  const [campaigns, setCampaigns] = useState<PhilanthropyCampaign[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState<typeof TOOLKIT[number] | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", goalAmount: "",
    beneficiary: "", startDate: "", endDate: "",
  });

  const load = useCallback(async (oid: string) => {
    const res = await fetch(`/api/philanthropy?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setCampaigns((await res.json()) as PhilanthropyCampaign[]);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    const beneficiary = new URLSearchParams(window.location.search).get("beneficiary");
    if (beneficiary) {
      setForm((f) => ({ ...f, beneficiary }));
      setCreateOpen(true);
    }
  }, []);

  function campaignSlug(title: string) {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    return `${base || "campaign"}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function shareLink(slug: string | null) {
    if (!slug) { toast.error("No public page for this campaign"); return; }
    const url = `${window.location.origin}/donate/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Donation link copied");
  }

  async function createCampaign() {
    if (!orgId || !form.title) return;
    const slug = campaignSlug(form.title);
    const res = await fetch("/api/philanthropy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        description: form.description,
        goalAmount: form.goalAmount,
        beneficiary: form.beneficiary,
        startDate: form.startDate,
        endDate: form.endDate,
        publicPageSlug: slug,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Failed to create campaign"); return; }
    toast.success("Campaign created!");
    setCreateOpen(false);
    setForm({ title: "", description: "", goalAmount: "", beneficiary: "", startDate: "", endDate: "" });
    load(orgId);
  }

  const totalRaised = campaigns.reduce((s, c) => s + Number(c.raised_amount ?? 0), 0);
  const totalGoal = campaigns.reduce((s, c) => s + Number(c.goal_amount ?? 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.is_active);

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Philanthropy & Fundraising"
        description={`${campaigns.length} campaigns · ${formatCurrency(totalRaised)} raised total`}
        action={<Button size="sm" className="officer-touch" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>New campaign</Button>}
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

      {campaigns.length === 0 ? (
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

                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button variant="secondary" size="sm" icon={<Share2 size={12} />} className="flex-1" onClick={() => shareLink(campaign.public_page_slug)}>
                    Share link
                  </Button>
                  {campaign.public_page_slug && (
                    <a href={`/donate/${campaign.public_page_slug}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="secondary" size="sm" icon={<QrCode size={12} />} className="w-full">Open page</Button>
                    </a>
                  )}
                  {campaign.is_active && campaign.public_page_slug && (
                    <a href={`/donate/${campaign.public_page_slug}`} className="flex-1">
                      <Button size="sm" icon={<DollarSign size={12} />} className="w-full bg-green-600 hover:bg-green-700">Donate</Button>
                    </a>
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
          {TOOLKIT.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setToolkitOpen(item)}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors text-left w-full"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Modal
        open={!!toolkitOpen}
        onClose={() => setToolkitOpen(null)}
        title={toolkitOpen?.title ?? "Template"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToolkitOpen(null)}>Close</Button>
            {toolkitOpen && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(toolkitOpen.caption);
                    toast.success("Template copied");
                  }}
                >
                  Copy text
                </Button>
                <Link href={toolkitOpen.href}>
                  <Button>Open in app</Button>
                </Link>
              </>
            )}
          </>
        }
      >
        {toolkitOpen && (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{toolkitOpen.caption}</p>
        )}
      </Modal>

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
