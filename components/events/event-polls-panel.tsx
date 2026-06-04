"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input, Modal } from "@/components/ui";

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
}

export function EventPollsPanel({
  eventId,
  orgId,
  canManage,
}: {
  eventId: string;
  orgId: string;
  canManage: boolean;
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/events/polls?event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const data = await res.json();
      setPolls(
        (data as Poll[]).map((p) => ({
          ...p,
          options: Array.isArray(p.options) ? p.options : [],
          votes: (p.votes ?? {}) as Record<string, number>,
        })),
      );
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createPoll() {
    if (!question.trim() || !optA.trim() || !optB.trim()) return;
    const res = await fetch("/api/events/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        orgId,
        question,
        options: [optA, optB, optC].filter((o) => o?.trim()),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Failed to create poll");
      return;
    }
    toast.success("Poll created");
    setOpen(false);
    setQuestion("");
    setOptA("");
    setOptB("");
    setOptC("");
    load();
  }

  async function vote(pollId: string, optionIndex: number) {
    const res = await fetch("/api/events/polls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionIndex }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "Vote failed");
      return;
    }
    toast.success("Vote recorded");
    load();
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader
        title="Event polls"
        description="Quick preference polls for your chapter (Partiful-style)"
        action={
          canManage ? (
            <Button size="sm" icon={<Plus size={12} />} onClick={() => setOpen(true)}>
              Add poll
            </Button>
          ) : undefined
        }
      />
      {polls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No polls yet.</p>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
            return (
              <div key={poll.id} className="p-3 rounded-xl border border-border space-y-2">
                <p className="font-medium text-sm flex items-center gap-2">
                  <BarChart3 size={14} className="text-greek-600" />
                  {poll.question}
                </p>
                {poll.options.map((opt, idx) => {
                  const count = poll.votes[String(idx)] ?? 0;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => vote(poll.id, idx)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-greek-300 hover:bg-greek-50/50 transition-colors"
                      >
                        {opt}
                        <span className="float-right text-muted-foreground text-xs">
                          {count} · {pct}%
                        </span>
                      </button>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full bg-greek-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create poll"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createPoll}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What time works best?" />
          <Input label="Option 1" value={optA} onChange={(e) => setOptA(e.target.value)} />
          <Input label="Option 2" value={optB} onChange={(e) => setOptB(e.target.value)} />
          <Input label="Option 3 (optional)" value={optC} onChange={(e) => setOptC(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}
