"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building, GraduationCap, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { orgTypeLabel } from "@/lib/utils";

interface UniversityOrg {
  id: string;
  name: string;
  type: string;
  campus: string | null;
  council_or_league: string | null;
  memberCount: number;
  highRiskIncidents: number;
}

export default function UniversityAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<UniversityOrg[]>([]);
  const [campuses, setCampuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const check = await fetch("/api/university-admin/check");
      const checkData = await check.json();
      if (!checkData.ok) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      const res = await fetch("/api/university-admin/orgs");
      const data = await res.json();
      if (res.ok) {
        setOrgs(data.orgs ?? []);
        setCampuses(data.campuses ?? []);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (allowed === false) {
    return (
      <div className="space-y-4">
        <PageHeader title="University admin" />
        <Alert
          type="warning"
          title="Campus access restricted"
          description="Set UNIVERSITY_ADMIN_EMAILS (and optionally UNIVERSITY_ADMIN_CAMPUSES) in the server environment."
        />
      </div>
    );
  }

  const greek = orgs.filter((o) => o.type === "fraternity" || o.type === "sorority").length;
  const sports = orgs.filter((o) => o.type === "club_sports").length;
  const atRisk = orgs.filter((o) => o.highRiskIncidents > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="University admin"
        description="Read-only oversight of Greek and student orgs on your campus"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Organizations" value={orgs.length} icon={<Building size={18} />} />
        <StatCard title="Greek chapters" value={greek} icon={<GraduationCap size={18} />} />
        <StatCard title="Club sports" value={sports} icon={<Users size={18} />} />
        <StatCard title="High-risk flags" value={atRisk} icon={<AlertTriangle size={18} />} />
      </div>

      {campuses.length > 0 && campuses[0] !== "all" && (
        <p className="text-sm text-muted-foreground">
          Filtered to campus: {campuses.join(", ")}
        </p>
      )}

      {loading ? (
        <Card className="h-40 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : orgs.length === 0 ? (
        <EmptyState icon={<Building size={24} />} title="No organizations" description="Chapters on this campus will appear here." />
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
                    {o.council_or_league ? ` · ${o.council_or_league}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={`${o.memberCount} members`} color="gray" />
                  {o.highRiskIncidents > 0 && (
                    <Badge label={`${o.highRiskIncidents} high-risk incident(s)`} color="red" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
