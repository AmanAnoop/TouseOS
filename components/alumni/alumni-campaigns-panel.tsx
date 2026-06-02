"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  body: string;
  audience: string;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

export function AlumniCampaignsPanel({ orgId }: { orgId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    body: "",
    audience: "alumni",
  });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/alumni/campaigns?org_id=${orgId}`);
    const data = await res.json();
    if (res.ok) setCampaigns(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(sendNow: boolean) {
    setSending(true);
    const res = await fetch("/api/alumni/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...form, sendNow }),
    });
    setSending(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success(data.message);
    setOpen(false);
    setForm({ title: "", subject: "", body: "", audience: "alumni" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon={<Mail size={14} />} onClick={() => setOpen(true)}>
          New campaign
        </Button>
      </div>

      {loading ? (
        <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Mail size={24} />}
          title="No alumni campaigns"
          description="Send newsletters, reunion invites, or mentorship calls to alumni with email on file."
          action={<Button size="sm" onClick={() => setOpen(true)}>Create campaign</Button>}
        />
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <Card key={c.id} padding="sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.status === "sent"
                      ? `Sent ${formatDate(c.sent_at ?? c.created_at)} · ${c.recipient_count} recipients`
                      : `Draft · ${formatDate(c.created_at)}`}
                  </p>
                </div>
                <Badge label={c.status} color={c.status === "sent" ? "green" : "gray"} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Alumni email campaign"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="secondary" loading={sending} onClick={() => submit(false)}>Save draft</Button>
            <Button icon={<Send size={14} />} loading={sending} onClick={() => submit(true)} disabled={!form.title || !form.subject || !form.body}>
              Send now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Campaign name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Email subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Select
            label="Audience"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
            options={[
              { value: "alumni", label: "All alumni with email" },
              { value: "mentors", label: "Mentors only" },
            ]}
          />
          <Textarea label="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-[160px]" />
        </div>
      </Modal>
    </div>
  );
}
