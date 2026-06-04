"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Textarea } from "@/components/ui";

export function FeedComposer({ orgId, onPosted }: { orgId: string; onPosted?: () => void }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"announcement" | "photo">("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function postAnnouncement() {
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
    resetAndClose();
    onPosted?.();
  }

  async function postPhoto(files: FileList) {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const path = `${orgId}/${user.id}/${Date.now()}-${file.name}`;
    const { data: stored, error: upErr } = await supabase.storage.from("photos").upload(path, file);
    if (upErr) {
      setLoading(false);
      toast.error(upErr.message);
      return;
    }
    const res = await fetch("/api/feed/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        storagePath: stored.path,
        caption: caption || null,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not post photo");
      return;
    }
    toast.success("Photo posted to feed");
    resetAndClose();
    onPosted?.();
  }

  function resetAndClose() {
    setTitle("");
    setBody("");
    setCaption("");
    setPinned(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" icon={<Megaphone size={14} />} onClick={() => setOpen(true)} className="w-full officer-touch">
        Post to feed
      </Button>
    );
  }

  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("announcement")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${mode === "announcement" ? "bg-greek-600 text-white border-greek-600" : "border-border"}`}
        >
          Announcement
        </button>
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${mode === "photo" ? "bg-greek-600 text-white border-greek-600" : "border-border"}`}
        >
          Photo
        </button>
      </div>

      {mode === "announcement" ? (
        <>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[80px]" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={postAnnouncement} disabled={!title.trim() || !body.trim()}>
              Publish
            </Button>
          </div>
        </>
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && postPhoto(e.target.files)} />
          <Textarea label="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[60px]" />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={loading}
              icon={<ImageIcon size={14} aria-hidden />}
              onClick={() => fileRef.current?.click()}
            >
              Choose photo
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
