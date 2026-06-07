"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BellOff, MessageCircle, Pin, Plus, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card, EmptyState, PageHeader, SearchInput,
} from "@/components/ui";
import { CreateRoomModal } from "@/components/chats/create-room-modal";
import { NewDmModal } from "@/components/chats/new-dm-modal";
import type { ChatRoomSummary } from "@/components/chats/types";
import { canManageChats } from "@/lib/chat-access";
import { timeAgo } from "@/lib/utils";
import type { MemberProfile } from "@/types";
import type { RoleName } from "@/lib/permissions";

interface ChatsPageClientProps {
  orgId: string;
  orgName: string;
  userId: string;
  role: RoleName;
}

export function ChatsPageClient({ orgId, orgName, userId, role }: ChatsPageClientProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  const canManage = canManageChats(role);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/chats/rooms?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) setRooms(await res.json());
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadRooms();
    fetch(`/api/members?org_id=${encodeURIComponent(orgId)}&scope=roster`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMembers);
  }, [orgId, loadRooms]);

  const filtered = rooms.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q)
      || r.last_message?.body.toLowerCase().includes(q);
  });

  async function togglePin(room: ChatRoomSummary) {
    const res = await fetch("/api/chats/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        roomId: room.id,
        pinnedToTop: !room.pinned_to_top,
      }),
    });
    if (!res.ok) {
      toast.error("Could not update pin");
      return;
    }
    loadRooms();
  }

  async function toggleMute(room: ChatRoomSummary) {
    const res = await fetch("/api/chats/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        roomId: room.id,
        muted: !room.muted,
      }),
    });
    if (!res.ok) {
      toast.error("Could not update mute");
      return;
    }
    loadRooms();
  }

  return (
    <div>
      <PageHeader
        title="Chats"
        description={`Group chats and direct messages for ${orgName}`}
        orgLabel={orgName}
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<MessageCircle size={16} />} onClick={() => setDmOpen(true)}>
              New message
            </Button>
            {canManage && (
              <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                New group
              </Button>
            )}
          </div>
        )}
      />

      <div className="mb-6">
        <SearchInput value={query} onChange={setQuery} placeholder="Search chats…" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="ds-skeleton h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? "No chats match your search" : "No conversations yet"}
          description={canManage
            ? "Start a group chat for your chapter or message a member directly."
            : "Message a member or wait for an officer to add you to a group."}
          action={(
            <div className="flex gap-2">
              <Button onClick={() => setDmOpen(true)}>Message someone</Button>
              {canManage && <Button variant="secondary" onClick={() => setCreateOpen(true)}>Create group</Button>}
            </div>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((room) => (
            <Card key={room.id} padding="none" className="overflow-hidden">
              <div className="flex items-stretch">
                <Link
                  href={`/chats/${room.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 p-4 transition hover:bg-[var(--ds-bg)]"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: room.accent_color ?? "var(--org-primary)" }}
                  >
                    {room.room_type === "dm" ? <MessageCircle size={18} /> : <Users size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-[var(--ds-text)]">{room.name}</span>
                      {room.pinned_to_top && <Pin size={12} className="shrink-0 text-[var(--ds-text-muted)]" />}
                      {room.muted && <BellOff size={12} className="shrink-0 text-[var(--ds-text-muted)]" />}
                      {room.unread_count > 0 && (
                        <Badge label={String(room.unread_count)} color="blue" className="ml-auto shrink-0" />
                      )}
                    </div>
                    {room.last_message && (
                      <p className="truncate text-sm text-[var(--ds-text-muted)]">
                        {room.last_message.sender_name ? `${room.last_message.sender_name}: ` : ""}
                        {room.last_message.body}
                      </p>
                    )}
                  </div>
                  {room.last_message?.created_at && (
                    <span className="shrink-0 self-start text-xs text-[var(--ds-text-muted)]">
                      {timeAgo(room.last_message.created_at)}
                    </span>
                  )}
                </Link>
                <div className="flex flex-col border-l border-[var(--ds-border)]">
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center px-3 hover:bg-[var(--ds-bg)]"
                    onClick={() => togglePin(room)}
                    aria-label={room.pinned_to_top ? "Unpin" : "Pin"}
                  >
                    <Pin size={14} className={room.pinned_to_top ? "text-[var(--org-primary)]" : "text-[var(--ds-text-muted)]"} />
                  </button>
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center border-t border-[var(--ds-border)] px-3 hover:bg-[var(--ds-bg)]"
                    onClick={() => toggleMute(room)}
                    aria-label={room.muted ? "Unmute" : "Mute"}
                  >
                    <BellOff size={14} className={room.muted ? "text-[var(--org-primary)]" : "text-[var(--ds-text-muted)]"} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        members={members}
        onCreated={loadRooms}
      />
      <NewDmModal
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        orgId={orgId}
        userId={userId}
        members={members}
      />
    </div>
  );
}
