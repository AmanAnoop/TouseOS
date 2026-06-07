"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal, Pin, Reply, Smile, Trash2,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn, initials, timeAgo } from "@/lib/utils";
import type { ChatMessage } from "@/components/chats/types";

const QUICK_EMOJI = ["👍", "❤️", "😂", "🔥", "👏"];

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  isWall: boolean;
  canModerate: boolean;
  userId: string | null;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string, pinned: boolean) => void;
  onMarkRead?: (messageId: string) => void;
}

export function ChatMessageItem({
  message,
  isOwn,
  isWall,
  canModerate,
  userId,
  onReply,
  onReact,
  onDelete,
  onPin,
  onMarkRead,
}: ChatMessageItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const reactionGroups = new Map<string, { count: number; mine: boolean }>();
  for (const r of message.reactions) {
    const prev = reactionGroups.get(r.emoji) ?? { count: 0, mine: false };
    reactionGroups.set(r.emoji, {
      count: prev.count + 1,
      mine: prev.mine || r.user_id === userId,
    });
  }

  useEffect(() => {
    if (isWall && onMarkRead && userId && !message.read_by.includes(userId) && !isOwn) {
      onMarkRead(message.id);
    }
  }, [isWall, message.id, message.read_by, onMarkRead, userId, isOwn]);

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4",
        message.is_pinned && "ring-1 ring-[var(--org-primary)]/40",
        isWall && "shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: "var(--org-primary)" }}
        >
          {initials(message.sender_name ?? "M")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[var(--ds-text)]">{message.sender_name ?? "Member"}</span>
            <span className="text-xs text-[var(--ds-text-muted)]">{timeAgo(message.created_at)}</span>
            {message.is_pinned && <Badge label="Pinned" color="purple" />}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[var(--ds-text)]">{message.body}</p>

          {reactionGroups.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(reactionGroups.entries()).map(([emoji, meta]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-sm",
                    meta.mine
                      ? "border-[var(--org-primary)] bg-[var(--org-primary)]/10"
                      : "border-[var(--ds-border)] bg-[var(--ds-bg)]",
                  )}
                >
                  {emoji} {meta.count}
                </button>
              ))}
            </div>
          )}

          {isWall && message.read_by.length > 0 && (
            <p className="mt-2 text-xs text-[var(--ds-text-muted)]">
              Seen by {message.read_by.length} {message.read_by.length === 1 ? "person" : "people"}
            </p>
          )}
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Message actions"
          >
            <MoreHorizontal size={16} />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--ds-bg)]"
                onClick={() => { onReply(message); setMenuOpen(false); }}
              >
                <Reply size={14} /> Reply
              </button>
              {QUICK_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--ds-bg)]"
                  onClick={() => { onReact(message.id, emoji); setMenuOpen(false); }}
                >
                  <Smile size={14} /> {emoji}
                </button>
              ))}
              {(canModerate || isOwn) && (
                <>
                  {canModerate && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--ds-bg)]"
                      onClick={() => { onPin(message.id, !message.is_pinned); setMenuOpen(false); }}
                    >
                      <Pin size={14} /> {message.is_pinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[var(--ds-bg)]"
                    onClick={() => { onDelete(message.id); setMenuOpen(false); }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
