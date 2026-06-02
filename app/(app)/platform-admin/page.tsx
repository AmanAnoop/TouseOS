"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDate, orgTypeLabel } from "@/lib/utils";

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

      {loading ? (
        <Card className="h-40 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : orgs.length === 0 ? (
        <EmptyState icon={<Building size={24} />} title="No organizations" description="Orgs will appear here as chapters onboard." />
      ) : (
        <div className="space-y-2">
          {orgs.map((o) => (
            <Card key={o.id} padding="sm">
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
      )}
    </div>
  );
}
