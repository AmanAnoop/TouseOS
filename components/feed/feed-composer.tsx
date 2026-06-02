"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, Input, Textarea } from "@/components/ui";

export function FeedComposer({ orgId, onPosted }: { orgId: string; onPosted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function post() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    const res = await fetch("/api/feed/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, title, body, pinned }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not post");
      return;
    }
    toast.success("Posted to chapter feed");
    setTitle("");
    setBody("");
    setPinned(false);
    setOpen(false);
    onPosted?.();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" icon={<Megaphone size={14} />} onClick={() => setOpen(true)} className="w-full">
        Post to feed
      </Button>
    );
  }

  return (
    <Card padding="sm" className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-2">
        <Megaphone size={14} />
        New feed post
      </p>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[80px]" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        Pin to top
      </label>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={post} disabled={!title.trim() || !body.trim()}>
          Publish
        </Button>
      </div>
    </Card>
  );
}
