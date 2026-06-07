"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Reply, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, EmptyState, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface EventComment {
  id: string;
  author_name: string | null;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_id: string | null;
}

export function EventCommentsPanel({ eventId }: { eventId: string }) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<EventComment | null>(null);
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/events/comments?event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) setComments((await res.json()) as EventComment[]);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, EventComment[]>();
  for (const c of comments.filter((c) => c.parent_id)) {
    const pid = c.parent_id!;
    if (!repliesByParent.has(pid)) repliesByParent.set(pid, []);
    repliesByParent.get(pid)!.push(c);
  }

  async function submit() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch("/api/events/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        body,
        parentId: replyTo?.id ?? null,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Could not post comment");
      return;
    }
    setBody("");
    setReplyTo(null);
    await loadComments();
    toast.success(replyTo ? "Reply posted" : "Comment posted");
  }

  function CommentBlock({ comment, depth = 0 }: { comment: EventComment; depth?: number }) {
    const replies = repliesByParent.get(comment.id) ?? [];
    return (
      <div className={depth > 0 ? "ml-6 mt-2 border-l-2 border-border pl-3" : ""}>
        <div className="rounded-xl bg-surface-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{comment.author_name ?? "Member"}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</p>
            </div>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => setReplyTo(comment)}
                className="text-xs text-greek-600 hover:underline flex items-center gap-1"
              >
                <Reply size={12} />
                Reply
              </button>
            )}
          </div>
          <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{comment.body}</p>
        </div>
        {replies.map((r) => (
          <CommentBlock key={r.id} comment={r} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="Discussion" icon={<MessageCircle size={16} />} description="Questions, updates, and replies" />
      <div className="space-y-4">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-surface-1 rounded-lg px-3 py-2">
            <span>Replying to {replyTo.author_name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-greek-600 hover:underline">
              Cancel
            </button>
          </div>
        )}
        <Textarea
          placeholder={replyTo ? "Write a reply..." : "Share a thought or question..."}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[80px]"
        />
        <Button size="sm" icon={<Send size={14} />} onClick={submit} loading={sending} disabled={!body.trim()}>
          {replyTo ? "Post reply" : "Post comment"}
        </Button>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : topLevel.length === 0 ? (
          <EmptyState icon={<MessageCircle size={20} />} title="No comments yet" description="Be the first to start the conversation." />
        ) : (
          <div className="space-y-3">
            {topLevel.map((c) => (
              <CommentBlock key={c.id} comment={c} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
