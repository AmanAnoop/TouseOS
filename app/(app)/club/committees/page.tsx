"use client";

import { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isClubOrg } from "@/lib/utils";

const SUGGESTED_COMMITTEES = [
  "Events",
  "Finance",
  "Marketing / PR",
  "Membership",
  "Community service",
  "Professional development",
  "Social",
  "Technology",
];

interface MemberRow {
  id: string;
  full_name: string;
  role: string;
  committees: string[] | null;
}

export default function ClubCommitteesPage() {
  const supabase = createClient();
  const [orgType, setOrgType] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("member_profiles")
      .select("id, full_name, role, committees")
      .eq("org_id", oid)
      .order("full_name");
    setMembers((data ?? []) as MemberRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, organizations(type)")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (m) {
        const type = String(((m.organizations as unknown) as Record<string, unknown>)?.type ?? "");
        setOrgType(type);
        if (isClubOrg(type)) load(m.org_id);
        else setLoading(false);
      }
    }
    init();
  }, [supabase, load]);

  const committeeMap = new Map<string, MemberRow[]>();
  for (const m of members) {
    const list = m.committees?.length ? m.committees : ["Unassigned"];
    for (const c of list) {
      if (!committeeMap.has(c)) committeeMap.set(c, []);
      committeeMap.get(c)!.push(m);
    }
  }

  if (!loading && orgType && !isClubOrg(orgType)) {
    return <PageHeader title="Committees" description="ClubOS feature for student organizations." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Committees & working groups"
        description="See who serves on each committee — assign committees from the member roster"
      />

      <Card padding="sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Suggested committees for campus orgs</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_COMMITTEES.map((c) => (
            <Badge key={c} label={c} color="gray" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Edit a member on the roster to add or update their committee assignments.
        </p>
      </Card>

      {loading ? (
        <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />
      ) : committeeMap.size === 0 ? (
        <EmptyState icon={<Users size={24} />} title="No committee assignments" description="Assign committees on individual roster profiles." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...committeeMap.entries()].map(([committee, roster]) => (
            <Card key={committee}>
              <p className="font-semibold text-sm mb-3">{committee}</p>
              <ul className="space-y-2">
                {roster.map((m) => (
                  <li key={`${committee}-${m.id}`} className="flex items-center justify-between text-sm">
                    <span>{m.full_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{m.role.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
