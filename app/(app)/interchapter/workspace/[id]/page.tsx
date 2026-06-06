"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, DollarSign, MessageSquare, Shield, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, Input, PageHeader, ProgressBar, Select,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

interface Workspace {
  id: string;
  proposal_id: string;
  org_ids: string[];
  title: string;
  shared_budget: { total?: number; line_items?: Array<{ label: string; amount: number; org: string }> };
  shared_tasks: Array<{ id: string; title: string; assignee?: string; done: boolean }>;
  chat_messages: Array<{ id: string; sender: string; body: string; created_at: string }>;
  guest_list: Array<{ name: string; org: string }>;
  risk_checklist: Record<string, boolean>;
  status: string;
}

const RISK_ITEMS = [
  { key: "venue_contract", label: "Venue contract uploaded" },
  { key: "sober_monitors", label: "Sober monitors assigned" },
  { key: "transportation", label: "Transportation plan" },
  { key: "security", label: "Security arranged" },
  { key: "advisor_approval", label: "Advisor approval" },
];

const STATUS_COLOR: Record<string, "green" | "yellow" | "gray" | "red" | "blue"> = {
  active: "green",
  completed: "blue",
  cancelled: "red",
};


export default function SharedWorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { orgName } = useOrg();
  const supabase = createClient();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState("Officer");
  const [chatInput, setChatInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guestOrg, setGuestOrg] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetOrg, setBudgetOrg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/interchapter/workspaces?id=${workspaceId}`);
    if (res.ok) {
      const { workspace } = await res.json();
      setWs(workspace);
      const ids = (workspace.org_ids as string[]) ?? [];
      if (ids.length > 0) {
        const nameMap: Record<string, string> = {};
        await Promise.all(
          ids.map(async (oid) => {
            const orgRes = await fetch(`/api/org/settings?org_id=${encodeURIComponent(oid)}`);
            if (orgRes.ok) {
              const { org } = await orgRes.json();
              nameMap[oid] = String(org?.name ?? oid.slice(0, 8));
            }
          }),
        );
        setOrgNames(nameMap);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (p) setUserName(String(p.full_name));
      }
      load();
    }
    init();
  }, [supabase, load]);

  useEffect(() => {
    if (orgName && !guestOrg) setGuestOrg(orgName);
    if (orgName && !budgetOrg) setBudgetOrg(orgName);
  }, [orgName, guestOrg, budgetOrg]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/interchapter/workspaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: workspaceId, senderName: userName, ...body }),
    });
    if (res.ok) {
      const { workspace } = await res.json();
      setWs(workspace);
    }
  }

  const partnerOrgs = useMemo(() => {
    const names = Object.values(orgNames);
    if (orgName && !names.includes(orgName)) names.unshift(orgName);
    return [...new Set(names.filter(Boolean))];
  }, [orgNames, orgName]);

  const settlement = useMemo(() => {
    const lines = ws?.shared_budget?.line_items ?? [];
    const byOrg: Record<string, number> = {};
    for (const line of lines) {
      const key = line.org || "Unassigned";
      byOrg[key] = (byOrg[key] ?? 0) + Number(line.amount ?? 0);
    }
    const total = lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);
    return { byOrg, total };
  }, [ws?.shared_budget?.line_items]);

  if (!ws) {
    return <div className="p-8 text-center text-muted-foreground">Loading workspace...</div>;
  }

  const riskDone = RISK_ITEMS.filter((r) => ws.risk_checklist[r.key]).length;
  const tasksDone = ws.shared_tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-5">
      <Link href="/interchapter" className="inline-flex items-center gap-1 text-sm text-greek-600 hover:underline">
        <ArrowLeft size={14} /> Back to ExecLink
      </Link>

      <PageHeader
        title={ws.title}
        description="Shared planning workspace for co-hosted events — chat syncs to ExecLink Messages"
        action={
          <div className="flex gap-2 flex-wrap items-center">
            <Badge label={ws.status} color={STATUS_COLOR[ws.status] ?? "green"} />
            {ws.status === "active" && (
              <>
                <Button size="sm" variant="secondary" onClick={async () => {
                  await patch({ workspaceStatus: "completed" });
                  toast.success("Workspace marked complete");
                }}>Mark complete</Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  await patch({ workspaceStatus: "cancelled" });
                  toast.success("Workspace cancelled");
                }}>Cancel</Button>
              </>
            )}
          </div>
        }
      />

      {partnerOrgs.length >= 2 && (
        <p className="text-sm text-muted-foreground">
          Partners: {partnerOrgs.join(" · ")}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Shared chat" icon={<MessageSquare size={16} />} />
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {(ws.chat_messages ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet. Start planning!</p>
            ) : (
              ws.chat_messages.map((m) => (
                <div key={m.id} className="p-2 rounded-lg bg-surface-1">
                  <p className="text-xs font-semibold">{m.sender}</p>
                  <p className="text-sm">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message both chapters..." className="flex-1" />
            <Button size="sm" onClick={async () => {
              if (!chatInput.trim()) return;
              await patch({ chatMessage: chatInput.trim() });
              setChatInput("");
              toast.success("Message sent");
            }}>Send</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Shared tasks" icon={<CheckCircle2 size={16} />} />
          <ProgressBar value={ws.shared_tasks.length ? Math.round((tasksDone / ws.shared_tasks.length) * 100) : 100} label={`${tasksDone}/${ws.shared_tasks.length} complete`} size="sm" />
          <div className="space-y-2 mt-3 mb-3">
            {ws.shared_tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.done}
                  className="rounded cursor-pointer"
                  onChange={async () => {
                    await patch({ taskToggle: { id: t.id, done: !t.done } });
                  }}
                />
                <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="Add shared task..." className="flex-1" />
            <Button size="sm" variant="secondary" onClick={async () => {
              if (!taskInput.trim()) return;
              await patch({ task: { title: taskInput.trim() } });
              setTaskInput("");
            }}>Add</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Joint budget" icon={<DollarSign size={16} />} />
          <div className="space-y-2 mb-3">
            {(ws.shared_budget.line_items ?? []).map((line, i) => (
              <div key={i} className="flex justify-between text-sm p-2 rounded bg-surface-1">
                <span>{line.label} <span className="text-muted-foreground">({line.org})</span></span>
                <span className="font-medium">{formatCurrency(line.amount)}</span>
              </div>
            ))}
            {settlement.total > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-greek-200 bg-greek-50/50 dark:bg-greek-950/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Settlement summary</p>
                {Object.entries(settlement.byOrg).map(([org, amt]) => (
                  <div key={org} className="flex justify-between text-sm">
                    <span>{org}</span>
                    <span className="font-medium">{formatCurrency(amt)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatCurrency(settlement.total)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-2 mb-2">
            <Input placeholder="Line item" value={budgetLabel} onChange={(e) => setBudgetLabel(e.target.value)} />
            <Input type="number" placeholder="Amount" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
            <Select
              value={budgetOrg}
              onChange={(e) => setBudgetOrg(e.target.value)}
              options={partnerOrgs.map((n) => ({ value: n, label: n }))}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!budgetLabel.trim() || !budgetAmount}
            onClick={async () => {
              await patch({
                budgetLine: {
                  label: budgetLabel.trim(),
                  amount: parseFloat(budgetAmount) || 0,
                  org: budgetOrg || orgName || "Chapter",
                },
              });
              setBudgetLabel("");
              setBudgetAmount("");
              toast.success("Budget line added");
            }}
          >
            Add budget line
          </Button>
        </Card>

        <Card>
          <CardHeader title="Joint risk checklist" icon={<Shield size={16} />} />
          <ProgressBar value={Math.round((riskDone / RISK_ITEMS.length) * 100)} label={`${riskDone}/${RISK_ITEMS.length} complete`} color={riskDone === RISK_ITEMS.length ? "green" : "yellow"} size="sm" />
          <div className="space-y-2 mt-3">
            {RISK_ITEMS.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(ws.risk_checklist[item.key])}
                  onChange={() => patch({ riskItem: { [item.key]: !ws.risk_checklist[item.key] } })}
                  className="rounded"
                />
                {item.label}
              </label>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Shared guest list" icon={<Users size={16} />} />
          <div className="flex flex-wrap gap-2 mb-3">
            {(ws.guest_list ?? []).map((g, i) => (
              <Badge key={i} label={`${g.name} (${g.org})`} color="blue" />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input value={guestInput} onChange={(e) => setGuestInput(e.target.value)} placeholder="Guest name" className="flex-1 min-w-[140px]" />
            <Select
              value={guestOrg}
              onChange={(e) => setGuestOrg(e.target.value)}
              options={partnerOrgs.map((n) => ({ value: n, label: n }))}
              className="min-w-[140px]"
            />
            <Button size="sm" variant="secondary" onClick={async () => {
              if (!guestInput.trim()) return;
              await patch({ guest: { name: guestInput.trim(), org: guestOrg || orgName || "Chapter" } });
              setGuestInput("");
            }}>Add guest</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
