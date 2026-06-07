"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import type { MemberProfile } from "@/types";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  members: MemberProfile[];
  onCreated: () => void;
}

export function CreateRoomModal({
  open, onClose, orgId, members, onCreated,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState("chat");
  const [announcementsOnly, setAnnouncementsOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give your chat a name");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/chats/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: name.trim(),
        description,
        layout,
        announcementsOnly,
        memberUserIds: selected,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Could not create chat");
      return;
    }
    toast.success("Chat created");
    setName("");
    setDescription("");
    setSelected([]);
    onCreated();
    onClose();
  }

  function toggleMember(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="New group chat" size="md">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chapter chat, committee, etc." />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <Select
          label="Layout"
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
          options={[
            { value: "chat", label: "Conversation" },
            { value: "wall", label: "Announcement wall" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={announcementsOnly}
            onChange={(e) => setAnnouncementsOnly(e.target.checked)}
          />
          Officers post; everyone can reply in threads
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--ds-text)]">Add members</p>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--ds-border)] p-2">
            {members.filter((m) => m.user_id).map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--ds-bg)]">
                <input
                  type="checkbox"
                  checked={selected.includes(m.user_id!)}
                  onChange={() => toggleMember(m.user_id!)}
                />
                {m.full_name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleCreate}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}
