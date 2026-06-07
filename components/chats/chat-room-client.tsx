"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, Settings2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, SearchInput, Select, Textarea,
} from "@/components/ui";
import { ChatMessageItem } from "@/components/chats/chat-message-item";
import { ScreenshotGuard } from "@/components/chats/screenshot-guard";
import type { ChatMessage, ChatRoomDetail } from "@/components/chats/types";
import { canManageChats } from "@/lib/chat-access";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import type { RoleName } from "@/lib/permissions";

interface ChatRoomClientProps {
  roomId: string;
  orgId: string;
  userId: string;
  role: RoleName;
}

export function ChatRoomClient({ roomId, orgId, userId, role }: ChatRoomClientProps) {
  const [room, setRoom] = useState<ChatRoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canModerate = canManageChats(role);
  const isWall = room?.layout === "wall";

  const loadRoom = useCallback(async () => {
    const res = await fetch(`/api/chats/rooms/${roomId}?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) setRoom(await res.json());
  }, [roomId, orgId]);

  const loadMessages = useCallback(async (q?: string) => {
    const params = new URLSearchParams({ org_id: orgId });
    if (q) params.set("q", q);
    const res = await fetch(`/api/chats/rooms/${roomId}/messages?${params}`);
    if (res.ok) {
      setMessages(await res.json());
    }
    setLoading(false);
  }, [roomId, orgId]);

  useEffect(() => {
    setLoading(true);
    loadRoom();
    loadMessages();
  }, [loadRoom, loadMessages]);

  useEffect(() => {
    if (!isWall) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWall]);

  const handleRealtimeMessage = useCallback((payload: {
    eventType: string;
    new: Record<string, unknown>;
    old?: Record<string, unknown>;
  }) => {
    if (payload.eventType === "INSERT") {
      const msg = payload.new as unknown as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, reactions: [], read_by: [] }];
      });
    } else if (payload.eventType === "DELETE") {
      const old = payload.old as { id?: string };
      if (old?.id) setMessages((prev) => prev.filter((m) => m.id !== old.id));
    } else if (payload.eventType === "UPDATE") {
      const msg = payload.new as unknown as ChatMessage;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
    }
  }, []);

  const handleRealtimeReaction = useCallback(() => {
    loadMessages(searchQuery || undefined);
  }, [loadMessages, searchQuery]);

  useChatRealtime({
    roomId,
    onMessage: handleRealtimeMessage,
    onReaction: handleRealtimeReaction,
  });

  const threaded = useMemo(() => {
    const roots = messages.filter((m) => !m.parent_id);
    const replies = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      if (!m.parent_id) continue;
      const list = replies.get(m.parent_id) ?? [];
      list.push(m);
      replies.set(m.parent_id, list);
    }
    return { roots, replies };
  }, [messages]);

  const canPost = !room?.announcements_only || canModerate;

  async function sendMessage() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/chats/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        body: body.trim(),
        parentId: replyTo?.id ?? null,
      }),
    });
    setSending(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Could not send message");
      return;
    }
    const msg = await res.json();
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, { ...msg, reactions: [], read_by: [] }];
    });
    setBody("");
    setReplyTo(null);
  }

  async function react(messageId: string, emoji: string) {
    const res = await fetch(`/api/chats/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    loadMessages(searchQuery || undefined);
  }

  async function deleteMessage(messageId: string) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/chats/messages/${messageId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete message");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId && m.parent_id !== messageId));
  }

  async function pinMessage(messageId: string, pinned: boolean) {
    const res = await fetch(`/api/chats/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, isPinned: pinned }),
    });
    if (!res.ok) {
      toast.error("Could not update pin");
      return;
    }
    loadMessages(searchQuery || undefined);
  }

  async function markRead(messageId: string) {
    await fetch(`/api/chats/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markRead: true }),
    });
    setMessages((prev) => prev.map((m) =>
      m.id === messageId && !m.read_by.includes(userId)
        ? { ...m, read_by: [...m.read_by, userId] }
        : m,
    ));
  }

  async function updateRoomSettings(updates: Record<string, unknown>) {
    const res = await fetch("/api/chats/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, roomId, ...updates }),
    });
    if (!res.ok) {
      toast.error("Could not save settings");
      return;
    }
    await loadRoom();
    toast.success("Settings saved");
  }

  async function clearChat() {
    if (!confirm("Clear all messages in this chat? This cannot be undone.")) return;
    const res = await fetch(`/api/chats/rooms/${roomId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, clearAll: true }),
    });
    if (!res.ok) {
      toast.error("Could not clear chat");
      return;
    }
    setMessages([]);
    toast.success("Chat cleared");
  }

  async function timeoutMember(targetUserId: string, hours: number) {
    const until = hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
    const res = await fetch(`/api/chats/rooms/${roomId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId: targetUserId, timeoutUntil: until }),
    });
    if (!res.ok) {
      toast.error("Could not update member");
      return;
    }
    toast.success(hours > 0 ? `Member timed out for ${hours}h` : "Timeout cleared");
    loadRoom();
  }

  if (loading && !room) {
    return <div className="ds-skeleton h-64 w-full rounded-xl" />;
  }

  if (!room) {
    return (
      <EmptyState
        title="Chat not found"
        description="This conversation may have been removed or you no longer have access."
        action={<Link href="/chats"><Button>Back to chats</Button></Link>}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <ScreenshotGuard
        orgId={orgId}
        roomId={roomId}
        enabled={room.screenshot_alerts}
        disabled={room.screenshots_disabled}
      />

      <Link href="/chats" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]">
        <ArrowLeft size={14} /> All chats
      </Link>

      <PageHeader
        title={room.name}
        description={room.description ?? (room.announcements_only ? "Officers can post; everyone can reply" : undefined)}
        action={(
          <div className="flex items-center gap-2">
            {room.announcements_only && <Badge label="Announcements" color="blue" />}
            <Button variant="ghost" size="sm" onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
              <Search size={16} />
            </Button>
            {(canModerate || room.room_type === "group") && (
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} aria-label="Settings">
                <Settings2 size={16} />
              </Button>
            )}
          </div>
        )}
      />

      {searchOpen && (
        <div className="mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search messages…"
          />
        </div>
      )}

      {searchOpen && (
        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => loadMessages(searchQuery || undefined)}>
            Search
          </Button>
        </div>
      )}

      {room.announcements_only && !canPost && (
        <Alert
          type="info"
          title="Announcements mode"
          description="Only officers can start new posts. Tap reply on a thread to join the conversation."
          className="mb-4"
        />
      )}

      <div className={isWall ? "space-y-4" : "flex-1 space-y-3 overflow-y-auto pb-4"}>
        {threaded.roots.length === 0 && (
          <EmptyState
            title="No messages yet"
            description={canPost ? "Say hello to get the conversation started." : "Waiting for the first announcement."}
          />
        )}

        {threaded.roots.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <ChatMessageItem
              message={msg}
              isOwn={msg.sender_id === userId}
              isWall={isWall}
              canModerate={canModerate}
              userId={userId}
              onReply={setReplyTo}
              onReact={react}
              onDelete={deleteMessage}
              onPin={pinMessage}
              onMarkRead={isWall ? markRead : undefined}
            />
            {(threaded.replies.get(msg.id) ?? []).map((reply) => (
              <div key={reply.id} className="ml-6 border-l-2 border-[var(--ds-border)] pl-4">
                <ChatMessageItem
                  message={reply}
                  isOwn={reply.sender_id === userId}
                  isWall={false}
                  canModerate={canModerate}
                  userId={userId}
                  onReply={setReplyTo}
                  onReact={react}
                  onDelete={deleteMessage}
                  onPin={pinMessage}
                />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {(canPost || replyTo) && (
        <Card className="sticky bottom-0 mt-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface)] p-4">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--ds-bg)] px-3 py-2 text-sm">
              <span>Replying to {replyTo.sender_name}</span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? "Write a reply…" : isWall ? "Share an update…" : "Type a message…"}
              rows={2}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button loading={sending} onClick={sendMessage} className="self-end">
              Send
            </Button>
          </div>
        </Card>
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Chat settings" size="md">
        {canModerate && room.room_type === "group" && (
          <div className="space-y-4">
            <Input
              label="Name"
              defaultValue={room.name}
              onBlur={(e) => updateRoomSettings({ name: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={room.announcements_only}
                onChange={(e) => updateRoomSettings({ announcementsOnly: e.target.checked })}
              />
              Announcements mode (officers post, members reply)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={room.screenshot_alerts}
                onChange={(e) => updateRoomSettings({ screenshotAlerts: e.target.checked })}
              />
              Alert officers on screenshots
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={room.screenshots_disabled}
                onChange={(e) => updateRoomSettings({ screenshotsDisabled: e.target.checked })}
              />
              Discourage screenshots (overlay)
            </label>
            <Select
              label="Layout"
              value={room.layout}
              onChange={(e) => updateRoomSettings({ layout: e.target.value })}
              options={[
                { value: "chat", label: "Conversation" },
                { value: "wall", label: "Announcement wall" },
              ]}
            />
            <Button variant="danger" onClick={clearChat}>Clear all messages</Button>
          </div>
        )}

        {canModerate && room.members?.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Member timeout</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {room.members.filter((m) => m.user_id !== userId).map((m) => (
                <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-[var(--ds-border)] px-3 py-2 text-sm">
                  <span>
                    {m.full_name}
                    {m.timeout_until && new Date(m.timeout_until) > new Date() && (
                      <Badge label="Timed out" color="orange" className="ml-2" />
                    )}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => timeoutMember(m.user_id, 1)}>1h</Button>
                    <Button size="sm" variant="secondary" onClick={() => timeoutMember(m.user_id, 24)}>24h</Button>
                    <Button size="sm" variant="ghost" onClick={() => timeoutMember(m.user_id, 0)}>Clear</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
