"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Copy, Eye, Flag, Shield, Users } from "lucide-react";
import { PlatformBillingPanel } from "@/components/platform-admin/platform-billing-panel";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, StatCard, Tabs } from "@/components/ui";
import { formatCurrency, formatDate, orgTypeLabel } from "@/lib/utils";

interface PlatformOrg {
  id: string;
  name: string;
  type: string;
  campus: string | null;
  created_at: string;
  memberCount: number;
  eventCount: number;
}

export default function PlatformAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<PlatformOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    counts: { organizations: number; members: number; events: number };
    donationsRaised: number;
    featureFlags: Record<string, boolean>;
  } | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<{
    org: Record<string, unknown>;
    stats: {
      members: number;
      activeMembers: number;
      events: number;
      openIncidents: number;
      duesCollected: number;
      philanthropyRaised: number;
    };
    recentEvents: Array<{ id: string; title: string; starts_at: string; status: string }>;
    recentIncidents: Array<{ id: string; severity: string; status: string; created_at: string }>;
    campaigns: Array<{ title: string; raised_amount: number; goal_amount: number; is_active: boolean }>;
  } | null>(null);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);
  const [tab, setTab] = useState("orgs");
  const [reports, setReports] = useState<Array<{
    id: string;
    org_name: string;
    resource_id: string;
    reason: string;
    status: string;
    created_at: string;
    suspended?: boolean;
    target_display_name?: string | null;
    profile_paused?: boolean;
  }>>([]);

  async function suspendProfile(reportId: string, userId: string, suspend: boolean) {
    const res = await fetch("/api/platform-admin/greekmatch-suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, userId, suspend }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Action failed");
      return;
    }
    toast.success(suspend ? "Profile suspended" : "Profile reactivated");
    setReports((prev) =>
      prev.map((x) =>
        x.id === reportId
          ? { ...x, suspended: suspend, status: suspend ? "reviewed" : x.status, profile_paused: suspend }
          : x,
      ),
    );
  }

  async function viewAsChapter(orgId: string) {
    const res = await fetch("/api/platform-admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not start view-as session");
      return;
    }
    toast.success(`Viewing as ${data.orgName}`);
    setSelectedOrgId(null);
    router.push("/dashboard");
    router.refresh();
  }

  async function openOrgDetail(orgId: string) {
    setSelectedOrgId(orgId);
    setOrgDetail(null);
    setOrgDetailLoading(true);
    const res = await fetch(`/api/platform-admin/org?org_id=${encodeURIComponent(orgId)}`);
    setOrgDetailLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not load organization");
      setSelectedOrgId(null);
      return;
    }
    setOrgDetail(data);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const check = await fetch("/api/platform-admin/check");
      const checkData = await check.json();
      if (!checkData.ok) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      const [orgsRes, statsRes] = await Promise.all([
        fetch("/api/platform-admin/orgs"),
        fetch("/api/platform-admin/stats"),
      ]);
      const orgsData = await orgsRes.json();
      const statsData = await statsRes.json();
      if (orgsRes.ok) setOrgs(orgsData.orgs ?? []);
      if (statsRes.ok) setStats(statsData);
      const reportsRes = await fetch("/api/platform-admin/greekmatch-reports");
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData.reports ?? []);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (allowed === false) {
    return (
      <div className="space-y-4">
        <PageHeader title="Platform admin" />
        <Alert
          type="warning"
          title="Access restricted"
          description="Set PLATFORM_ADMIN_EMAILS in the server environment to your email to use multi-tenant oversight."
        />
      </div>
    );
  }

  const totalMembers = orgs.reduce((s, o) => s + o.memberCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform admin"
        description="Multi-tenant overview for TouseOS operators"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Organizations" value={stats?.counts.organizations ?? orgs.length} icon={<Building size={18} />} />
        <StatCard title="Platform members" value={stats?.counts.members ?? totalMembers} icon={<Users size={18} />} />
        <StatCard title="Events hosted" value={stats?.counts.events ?? 0} icon={<Shield size={18} />} />
        <StatCard title="Donations (all)" value={stats ? `$${Math.round(stats.donationsRaised).toLocaleString()}` : "—"} icon={<Building size={18} />} />
      </div>

      {stats?.featureFlags && (
        <Card padding="sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Feature flags (env)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.featureFlags).map(([key, on]) => (
              <Badge key={key} label={`${key}: ${on ? "on" : "off"}`} color={on ? "green" : "gray"} />
            ))}
          </div>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: "orgs", label: "Organizations", count: orgs.length },
          { id: "billing", label: "Billing" },
          { id: "moderation", label: "GreekMatch reports", count: reports.filter((r) => r.status === "open").length || undefined },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <Card className="h-40 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : tab === "billing" ? (
        <PlatformBillingPanel />
      ) : tab === "orgs" ? (
        orgs.length === 0 ? (
          <EmptyState icon={<Building size={24} />} title="No organizations" description="Orgs will appear here as chapters onboard." />
        ) : (
          <div className="space-y-2">
            {orgs.map((o) => (
              <Card
                key={o.id}
                padding="sm"
                className="cursor-pointer hover:border-greek-300 transition-colors"
                onClick={() => openOrgDetail(o.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {orgTypeLabel(o.type)}
                      {o.campus ? ` · ${o.campus}` : ""}
                      {" · "}Created {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={`${o.memberCount} members`} color="gray" />
                    <Badge label={`${o.eventCount} events`} color="gray" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : reports.length === 0 ? (
        <EmptyState icon={<Flag size={24} />} title="No reports" description="GreekMatch user reports appear here for platform review." />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{r.org_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.target_display_name ?? `User ${r.resource_id.slice(0, 8)}…`}
                    {" · "}
                    {formatDate(r.created_at)}
                  </p>
                  <p className="text-sm mt-1">{r.reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={r.status} color={r.status === "open" ? "yellow" : "green"} />
                  {r.suspended && <Badge label="Suspended" color="red" />}
                  {!r.suspended && (
                    <Button
                      size="sm"
                      className="min-h-[44px] touch-manipulation"
                      onClick={() => suspendProfile(r.id, r.resource_id, true)}
                    >
                      Suspend profile
                    </Button>
                  )}
                  {r.suspended && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-[44px] touch-manipulation"
                      onClick={() => suspendProfile(r.id, r.resource_id, false)}
                    >
                      Unsuspend
                    </Button>
                  )}
                  {r.status === "open" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="min-h-[44px] touch-manipulation"
                        onClick={async () => {
                          const res = await fetch("/api/platform-admin/greekmatch-reports", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reportId: r.id, status: "reviewed" }),
                          });
                          if (res.ok) {
                            setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "reviewed" } : x));
                            toast.success("Marked reviewed");
                          }
                        }}
                      >
                        Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="min-h-[44px] touch-manipulation"
                        onClick={async () => {
                          const res = await fetch("/api/platform-admin/greekmatch-reports", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reportId: r.id, status: "dismissed" }),
                          });
                          if (res.ok) {
                            setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "dismissed" } : x));
                          }
                        }}
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedOrgId}
        onClose={() => { setSelectedOrgId(null); setOrgDetail(null); }}
        title={String(orgDetail?.org?.name ?? "Organization")}
        size="lg"
        footer={
          selectedOrgId ? (
            <div className="flex flex-wrap gap-2 w-full">
              <Button
                size="sm"
                icon={<Eye size={14} />}
                onClick={() => viewAsChapter(selectedOrgId)}
              >
                View as chapter
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => {
                  navigator.clipboard.writeText(selectedOrgId);
                  toast.success("Organization ID copied");
                }}
              >
                Copy org ID
              </Button>
            </div>
          ) : undefined
        }
      >
        {orgDetailLoading ? (
          <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
        ) : orgDetail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge label={orgTypeLabel(String(orgDetail.org.type ?? ""))} color="blue" />
              {Boolean(orgDetail.org.campus) && (
                <Badge label={String(orgDetail.org.campus)} color="gray" />
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard title="Members" value={orgDetail.stats.members} icon={<Users size={16} />} />
              <StatCard title="Active" value={orgDetail.stats.activeMembers} icon={<Users size={16} />} />
              <StatCard title="Open incidents" value={orgDetail.stats.openIncidents} icon={<Shield size={16} />} />
              <StatCard title="Dues collected" value={formatCurrency(orgDetail.stats.duesCollected)} icon={<Building size={16} />} />
              <StatCard title="Philanthropy" value={formatCurrency(orgDetail.stats.philanthropyRaised)} icon={<Building size={16} />} />
            </div>
            {orgDetail.recentEvents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent events</p>
                <ul className="space-y-1 text-sm">
                  {orgDetail.recentEvents.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <span>{e.title}</span>
                      <span className="text-muted-foreground text-xs">{formatDate(e.starts_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {orgDetail.campaigns.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Philanthropy campaigns</p>
                <ul className="space-y-1 text-sm">
                  {orgDetail.campaigns.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{c.title}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(c.raised_amount))}
                        {c.is_active ? " · active" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
