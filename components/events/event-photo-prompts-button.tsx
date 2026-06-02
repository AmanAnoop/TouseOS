"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/components/ui";
import { EVENT_PHOTO_PROMPTS } from "@/lib/event-photo-prompts";

export function EventPhotoPromptsButton({
  orgId,
  eventId,
  eventTitle,
}: {
  orgId: string;
  eventId: string;
  eventTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(EVENT_PHOTO_PROMPTS.map((p) => p.key));
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function send() {
    if (selected.length === 0) {
      toast.error("Select at least one prompt");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/events/photo-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        eventId,
        promptKeys: selected,
        notifyMembers: notify,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to send prompts");
      return;
    }
    toast.success(notify ? "Prompts sent — members notified" : "Photo prompts published");
    setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="secondary" icon={<Camera size={14} />} onClick={() => setOpen(true)}>
        Photo prompts
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Photo prompts: ${eventTitle}`}
        description="Nationals-safe prompts — no drinking or hazing-related requests"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={send} disabled={selected.length === 0}>
              Send prompts
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {EVENT_PHOTO_PROMPTS.map((p) => (
            <label key={p.key} className="flex items-start gap-2 p-2 rounded-lg border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(p.key)}
                onChange={() => toggle(p.key)}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify active members in-app
          </label>
        </div>
      </Modal>
    </>
  );
}
