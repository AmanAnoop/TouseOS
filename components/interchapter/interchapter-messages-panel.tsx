"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, EmptyState, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface PartnerOrg {
  id: string;
  name: string;
}

interface Message {
  id: string;
  org_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
}

export function InterchapterMessagesPanel({
  orgId,
  userName,
  partners,
}: {
  orgId: string;
  userName: string;
  partners: PartnerOrg[];
}) {
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    const res = await fetch(
      `/api/interchapter/messages?org_id=${orgId}&partner_org_id=${partnerId}`,
    );
    const data = await res.json();
    if (res.ok) setMessages(data);
  }, [orgId, partnerId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function send() {
    if (!body.trim() || !partnerId) return;
    setLoading(true);
    const res = await fetch("/api/interchapter/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, partnerOrgId: partnerId, body, senderName: userName }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Send failed");
      return;
    }
    setBody("");
    load();
  }

  if (partners.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare size={24} />}
        title="No partner chapters yet"
        description="Send or accept an interchapter proposal to open a direct message thread."
      />
    );
  }

  return (
    <Card className="flex flex-col h-[420px]">
      <div className="p-3 border-b border-border space-y-2">
        <p className="text-sm font-semibold">Direct messages</p>
        <Select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          options={partners.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet — say hello to coordinate your event.</p>
        ) : (
          messages.map((m) => {
            const mine = m.org_id === orgId;
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine ? "ml-auto bg-greek-600 text-white" : "bg-surface-1 text-foreground"
                }`}
              >
                <p className="text-xs opacity-80 mb-0.5">{m.sender_name ?? "Officer"} · {formatDate(m.created_at)}</p>
                <p>{m.body}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input
          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
          placeholder="Message partner chapter..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
        />
        <Button size="sm" icon={<Send size={14} />} loading={loading} onClick={send} disabled={!body.trim()}>
          Send
        </Button>
      </div>
    </Card>
  );
}
