"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Shield, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";

const WAIVER_TYPES = [
  { key: "liability", label: "Liability waiver", required: true },
  { key: "concussion", label: "Concussion form", required: true },
  { key: "emergency_contact", label: "Emergency contact form", required: true },
  { key: "medical", label: "Medical information form", required: true },
  { key: "travel_authorization", label: "Travel authorization", required: false },
  { key: "driver_form", label: "Driver form", required: false },
  { key: "code_of_conduct", label: "Code of conduct", required: true },
  { key: "league_eligibility", label: "League eligibility form", required: true },
  { key: "university_recreation", label: "University recreation form", required: true },
];

export function WaiversClient() {
  const supabase = createClient();
  const { orgId, userId } = useOrg();
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<Record<string, unknown>>>([]);
  const [waivers, setWaivers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);

  const load = useCallback(async (oid: string, userId: string) => {
    setLoading(true);
    const [membersRes, waiversRes, mpRes] = await Promise.all([
      supabase.from("member_profiles").select("id, full_name, membership_status").eq("org_id", oid).eq("membership_status", "active"),
      supabase.from("sports_waivers").select("*").eq("org_id", oid),
      supabase.from("member_profiles").select("id").eq("org_id", oid).eq("user_id", userId).maybeSingle(),
    ]);
    setMembers((membersRes.data ?? []) as Array<Record<string, unknown>>);
    setWaivers((waiversRes.data ?? []) as Array<Record<string, unknown>>);
    if (mpRes.data) setMyMemberId(mpRes.data.id);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (orgId && userId) load(orgId, userId);
  }, [orgId, userId, load]);

  async function signWaiver(waiverType: string, memberId?: string) {
    if (!orgId) return;
    setSigning(waiverType);
    const res = await fetch("/api/waivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, waiverType, memberId }),
    });
    setSigning(null);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to sign");
      return;
    }
    toast.success("Waiver marked complete");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) load(orgId, user.id);
  }

  const requiredTypes = WAIVER_TYPES.filter((t) => t.required).map((t) => t.key);
  const totalRequired = members.length * requiredTypes.length;
  const completed = waivers.filter((w) => w.status === "completed" && requiredTypes.includes(String(w.waiver_type))).length;
  const completionRate = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;

  const myWaivers = waivers.filter((w) => w.member_id === myMemberId);
  const myMissing = requiredTypes.filter(
    (type) => !myWaivers.find((w) => w.waiver_type === type && w.status === "completed"),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Waivers & Compliance"
        description="Track and complete required forms for all players"
      />

      {myMemberId && myMissing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader title="Your pending waivers" icon={<AlertTriangle size={16} />} />
          <div className="flex flex-wrap gap-2">
            {myMissing.map((key) => {
              const label = WAIVER_TYPES.find((t) => t.key === key)?.label ?? key;
              return (
                <Button
                  key={key}
                  size="sm"
                  loading={signing === key}
                  onClick={() => signWaiver(key)}
                >
                  Sign: {label}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Completion rate" value={`${completionRate}%`} deltaType={completionRate === 100 ? "up" : "down"} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Completed" value={completed} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Missing" value={totalRequired - completed} icon={<AlertTriangle size={18} />} />
        <StatCard title="Total players" value={members.length} icon={<Shield size={18} />} />
      </div>

      <Card>
        <CardHeader title="Overall waiver completion" />
        <ProgressBar value={completionRate} color={completionRate === 100 ? "green" : completionRate >= 75 ? "yellow" : "red"} size="md" label={`${completed}/${totalRequired} required waivers complete`} />
      </Card>

      <Card>
        <CardHeader title="Player compliance status" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : members.length === 0 ? (
          <EmptyState icon={<Shield size={20} />} title="No active players" />
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const memberWaivers = waivers.filter((w) => w.member_id === member.id);
              const completedCount = memberWaivers.filter((w) => w.status === "completed" && requiredTypes.includes(String(w.waiver_type))).length;
              const missingWaivers = requiredTypes.filter(
                (type) => !memberWaivers.find((w) => w.waiver_type === type && w.status === "completed"),
              );
              const pct = Math.round((completedCount / requiredTypes.length) * 100);
              return (
                <div key={String(member.id)} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{String(member.full_name)}</p>
                    {missingWaivers.length > 0 && (
                      <p className="text-xs text-red-500">
                        Missing: {missingWaivers.map((k) => WAIVER_TYPES.find((t) => t.key === k)?.label).join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge label={pct === 100 ? "Compliant" : `${missingWaivers.length} missing`} color={pct === 100 ? "green" : "red"} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
