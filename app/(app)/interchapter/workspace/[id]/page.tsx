"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, DollarSign, FileText, Heart, MessageSquare, Shield, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, CardHeader, Input, PageHeader, ProgressBar,
} from "@/components/ui";

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
  shared_documents: Array<{ id: string; title: string; url: string; uploaded_by: string; created_at: string }>;
  status: string;
}

const RISK_ITEMS = [
  { key: "venue_contract", label: "Venue contract uploaded" },
  { key: "sober_monitors", label: "Sober monitors assigned" },
  { key: "transportation", label: "Transportation plan" },
  { key: "security", label: "Security arranged" },
  { key: "advisor_approval", label: "Advisor approval" },
];


export default function SharedWorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const supabase = createClient();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [userName, setUserName] = useState("Officer");
  const [chatInput, setChatInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/interchapter/workspaces?id=${workspaceId}`);
    if (res.ok) {
      const { workspace } = await res.json();
      setWs(workspace);
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
    const interval = setInterval(load, 12_000);
    return () => clearInterval(interval);
  }, [supabase, load]);

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

  if (!ws) {
    return <div className="p-8 text-center text-muted-foreground">Loading workspace...</div>;
  }

  const riskDone = RISK_ITEMS.filter((r) => ws.risk_checklist[r.key]).length;
  const tasksDone = ws.shared_tasks.filter((t) => t.done).length;

  return (
    <div className="ds-page-stack">
      <Link href="/interchapter" className="inline-flex items-center gap-1 text-sm text-greek-600 hover:underline">
        <ArrowLeft size={14} /> Back to Interchapter
      </Link>

      <PageHeader
        title={ws.title}
        description="Shared planning workspace for co-hosted events — chat syncs to Interchapter messages"
        action={<Badge label={ws.status} color="green" />}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Chat */}
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

        {/* Tasks */}
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

        {/* Budget splitter */}
        <Card>
          <CardHeader title="Joint budget" icon={<DollarSign size={16} />} />
          <div className="space-y-2 mb-3">
            {(ws.shared_budget.line_items ?? []).map((line, i) => (
              <div key={i} className="flex justify-between text-sm p-2 rounded bg-surface-1">
                <span>{line.label} <span className="text-muted-foreground">({line.org})</span></span>
                <span className="font-medium">${line.amount}</span>
              </div>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => patch({
            budgetLine: { label: "Venue deposit", amount: 500, org: "Split 50/50" },
          })}>Add budget line</Button>
        </Card>

        {/* Risk checklist */}
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

        {/* Shared documents */}
        <Card className="lg:col-span-2">
          <CardHeader title="Shared documents" icon={<FileText size={16} />} />
          <div className="space-y-2 mb-3">
            {(ws.shared_documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Upload contracts, permits, or run-of-show links both chapters can access.</p>
            ) : (
              ws.shared_documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-1 hover:bg-surface-2 text-sm"
                >
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{doc.uploaded_by}</span>
                </a>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" className="flex-1 min-w-[140px]" />
            <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." className="flex-1 min-w-[180px]" />
            <Button size="sm" variant="secondary" onClick={async () => {
              if (!docTitle.trim() || !docUrl.trim()) return;
              await patch({ sharedDocument: { title: docTitle.trim(), url: docUrl.trim() } });
              setDocTitle("");
              setDocUrl("");
              toast.success("Document added");
            }}>Add link</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Joint philanthropy" icon={<Heart size={16} />} />
          <p className="text-sm text-muted-foreground mb-3">
            Launch a shared fundraising page both chapters can promote.
          </p>
          <Link href="/philanthropy">
            <Button size="sm" variant="secondary">Start joint campaign</Button>
          </Link>
        </Card>

        {/* Guest list */}
        <Card className="lg:col-span-2">
          <CardHeader title="Shared guest list" icon={<Users size={16} />} />
          <div className="flex flex-wrap gap-2 mb-3">
            {(ws.guest_list ?? []).map((g, i) => (
              <Badge key={i} label={`${g.name} (${g.org})`} color="blue" />
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={guestInput} onChange={(e) => setGuestInput(e.target.value)} placeholder="Guest name" className="flex-1" />
            <Button size="sm" variant="secondary" onClick={async () => {
              if (!guestInput.trim()) return;
              await patch({ guest: { name: guestInput.trim(), org: "Chapter" } });
              setGuestInput("");
            }}>Add guest</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
