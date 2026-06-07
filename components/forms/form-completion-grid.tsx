"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ClipboardList } from "lucide-react";

interface MemberRow {
  id: string;
  full_name: string;
  forms_completed: number;
  forms_required: number;
}

interface FormTemplate {
  id: string;
  title: string;
  is_required: boolean;
}

export function FormCompletionGrid({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [completedByMember, setCompletedByMember] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [memRes, formsRes, respRes] = await Promise.all([
        fetch(`/api/members?org_id=${encodeURIComponent(orgId)}&scope=roster`),
        fetch(`/api/forms?org_id=${encodeURIComponent(orgId)}`),
        fetch(`/api/forms/responses?org_id=${encodeURIComponent(orgId)}`),
      ]);
      const memData = memRes.ok ? await memRes.json() : [];
      const formsData = formsRes.ok ? await formsRes.json() : [];
      const respData = respRes.ok ? await respRes.json() : { responses: [] };

      setMembers((memData as MemberRow[]).filter((m) => m.forms_required > 0 || formsData.some((f: FormTemplate) => f.is_required)));
      setForms((formsData as FormTemplate[]).filter((f) => f.is_required));

      const map = new Map<string, Set<string>>();
      for (const r of (respData.responses ?? []) as Array<{ member_id: string; form_id: string }>) {
        const mid = String(r.member_id);
        if (!map.has(mid)) map.set(mid, new Set());
        map.get(mid)!.add(String(r.form_id));
      }
      setCompletedByMember(map);
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="h-12 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>;
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title="No required forms"
        description="Mark forms as required to track completion across the roster."
      />
    );
  }

  const incomplete = members.filter((m) => {
    const done = completedByMember.get(m.id)?.size ?? 0;
    return done < forms.length;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <strong>{members.length - incomplete.length}</strong> of <strong>{members.length}</strong> members have all required forms complete.
      </p>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1">
              <th className="text-left px-4 py-2 font-semibold text-xs uppercase text-muted-foreground">Member</th>
              {forms.map((f) => (
                <th key={f.id} className="text-center px-2 py-2 font-semibold text-xs uppercase text-muted-foreground max-w-[100px] truncate">{f.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const done = completedByMember.get(m.id) ?? new Set();
              const allDone = forms.every((f) => done.has(f.id));
              return (
                <tr key={m.id} className="border-b border-border hover:bg-surface-1">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="font-medium">{m.full_name}</span>
                    {allDone ? <Badge label="Complete" color="green" className="ml-2" /> : null}
                  </td>
                  {forms.map((f) => (
                    <td key={f.id} className="text-center px-2 py-2">
                      {done.has(f.id) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
