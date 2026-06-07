"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, FileText, Shield, AlertTriangle, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, StatCard,
} from "@/components/ui";
import {
  REQUIRED_SPORTS_WAIVER_KEYS,
  SPORTS_WAIVER_TYPES,
  waiverTypeLabel,
} from "@/lib/sports-waiver-types";

interface FormRow {
  id: string;
  title: string;
  type: string;
  is_required: boolean;
  description: string | null;
}

export function WaiversClient() {
  const supabase = createClient();
  const { orgId, userId } = useOrg();
  const { can } = usePermissions();
  const canManageForms = can("manage_documents");
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<Record<string, unknown>>>([]);
  const [waivers, setWaivers] = useState<Array<Record<string, unknown>>>([]);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (oid: string, uid: string) => {
    setLoading(true);
    const [membersRes, waiversRes, mpRes, formsRes] = await Promise.all([
      supabase.from("member_profiles").select("id, full_name, membership_status").eq("org_id", oid).eq("membership_status", "active"),
      supabase.from("sports_waivers").select("*").eq("org_id", oid),
      supabase.from("member_profiles").select("id").eq("org_id", oid).eq("user_id", uid).maybeSingle(),
      fetch(`/api/forms?org_id=${encodeURIComponent(oid)}`),
    ]);
    setMembers((membersRes.data ?? []) as Array<Record<string, unknown>>);
    setWaivers((waiversRes.data ?? []) as Array<Record<string, unknown>>);
    if (mpRes.data) setMyMemberId(mpRes.data.id);
    if (formsRes.ok) {
      const allForms = (await formsRes.json()) as FormRow[];
      setForms(allForms.filter((f) => SPORTS_WAIVER_TYPES.some((t) => t.key === f.type)));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (orgId && userId) load(orgId, userId);
  }, [orgId, userId, load]);

  const formByType = new Map(forms.map((f) => [f.type, f]));

  const requiredTypes = REQUIRED_SPORTS_WAIVER_KEYS;
  const totalRequired = members.length * requiredTypes.length;
  const completed = waivers.filter(
    (w) => w.status === "completed" && (requiredTypes as readonly string[]).includes(String(w.waiver_type)),
  ).length;
  const completionRate = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;

  const myWaivers = waivers.filter((w) => w.member_id === myMemberId);
  const myMissing = requiredTypes.filter(
    (type) => !myWaivers.find((w) => w.waiver_type === type && w.status === "completed"),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Waivers & Compliance"
        description="Complete required waiver forms — officers can edit templates in Forms"
        action={
          canManageForms ? (
            <Link href="/forms">
              <Button size="sm" variant="secondary" icon={<Settings size={14} />}>
                Manage waiver forms
              </Button>
            </Link>
          ) : undefined
        }
      />

      {myMemberId && myMissing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader title="Your pending waivers" icon={<AlertTriangle size={16} />} />
          <p className="text-sm text-muted-foreground mb-3">
            Open each form, read it, and sign with your typed signature. One-click sign is disabled for compliance.
          </p>
          <div className="flex flex-col gap-2">
            {myMissing.map((key) => {
              const form = formByType.get(key);
              const label = waiverTypeLabel(key);
              if (!form) {
                return (
                  <div key={key} className="text-sm text-amber-800">
                    {label} — no form published yet. Ask an officer to create a form with type &quot;{key}&quot; in Forms.
                  </div>
                );
              }
              return (
                <Link key={key} href={`/forms/${form.id}/fill`}>
                  <Button size="sm" className="w-full sm:w-auto justify-start" icon={<FileText size={14} />}>
                    Complete: {form.title || label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Completion rate" value={`${completionRate}%`} deltaType={completionRate === 100 ? "up" : "down"} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Completed" value={completed} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Missing" value={totalRequired - completed} icon={<AlertTriangle size={18} />} />
        <StatCard title="Published forms" value={forms.length} icon={<Shield size={18} />} />
      </div>

      <Card>
        <CardHeader title="Waiver templates" />
        {forms.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} />}
            title="No waiver forms yet"
            description="Officers create editable waiver forms under Forms. Set the form type to match each required waiver (e.g. liability, concussion)."
            action={canManageForms ? (
              <Link href="/forms"><Button size="sm">Create forms</Button></Link>
            ) : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {SPORTS_WAIVER_TYPES.map((t) => {
              const form = formByType.get(t.key);
              return (
                <li key={t.key} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {form ? form.title : "Not published"}
                      {t.required && " · Required"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {form && (
                      <Link href={`/forms/${form.id}/fill`}>
                        <Button size="sm" variant="secondary">Preview / fill</Button>
                      </Link>
                    )}
                    {canManageForms && (
                      <Link href="/forms">
                        <Button size="sm" variant="secondary">Edit in Forms</Button>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Overall waiver completion" />
        <ProgressBar value={completionRate} color={completionRate === 100 ? "green" : completionRate >= 75 ? "yellow" : "red"} size="md" label={`${completed}/${totalRequired} required waivers complete`} />
      </Card>

      <Card>
        <CardHeader title="Player compliance status" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : members.length === 0 ? (
          <EmptyState title="No active players" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-4">Player</th>
                  {requiredTypes.map((k) => (
                    <th key={k} className="py-2 px-1 text-center">{waiverTypeLabel(k).split(" ")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const mid = String(m.id);
                  return (
                    <tr key={mid} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{String(m.full_name)}</td>
                      {requiredTypes.map((k) => {
                        const done = waivers.some(
                          (w) => w.member_id === mid && w.waiver_type === k && w.status === "completed",
                        );
                        return (
                          <td key={k} className="py-2 px-1 text-center">
                            {done ? <CheckCircle2 size={14} className="text-green-600 inline" /> : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
