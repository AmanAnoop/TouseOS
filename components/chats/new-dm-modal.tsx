"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Modal, SearchInput } from "@/components/ui";
import type { MemberProfile } from "@/types";

interface NewDmModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  userId: string | null;
  members: MemberProfile[];
}

export function NewDmModal({ open, onClose, orgId, userId, members }: NewDmModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = members.filter((m) => {
    if (!m.user_id || m.user_id === userId) return false;
    if (!query.trim()) return true;
    return m.full_name.toLowerCase().includes(query.toLowerCase());
  });

  async function startDm(targetUserId: string) {
    setLoading(targetUserId);
    const res = await fetch("/api/chats/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, targetUserId }),
    });
    setLoading(null);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Could not start conversation");
      return;
    }
    const room = await res.json();
    onClose();
    router.push(`/chats/${room.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Message a member" size="sm">
      <div className="space-y-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search roster…" />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--ds-bg)]"
              onClick={() => startDm(m.user_id!)}
              disabled={loading === m.user_id}
            >
              <span>{m.full_name}</span>
              {loading === m.user_id && <span className="text-xs text-[var(--ds-text-muted)]">Opening…</span>}
            </button>
          ))}
          {!filtered.length && (
            <p className="py-4 text-center text-sm text-[var(--ds-text-muted)]">No members found</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
