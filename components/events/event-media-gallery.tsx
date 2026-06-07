"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check, Download, Heart, ImageIcon, MessageCircle, Upload, Video,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Button, Card, CardHeader, EmptyState, Modal, Textarea,
} from "@/components/ui";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateTime } from "@/lib/utils";

interface GalleryPhoto {
  id: string;
  url: string;
  original_url?: string | null;
  caption: string | null;
  uploader_name: string | null;
  created_at: string;
  status: string;
  media_type?: string;
  like_count: number;
  liked_by_me: boolean;
}

interface PhotoComment {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export function EventMediaGallery({
  eventId,
  orgId,
  eventTitle,
}: {
  eventId: string;
  orgId: string;
  eventTitle: string;
}) {
  const { can, loading: permLoading } = usePermissions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [pending, setPending] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "likes">("recent");
  const [requireApproval, setRequireApproval] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const canManage = !permLoading && can("manage_events");
  const canApprove = !permLoading && (can("approve_photos") || can("manage_events"));

  const loadGallery = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/events/gallery?org_id=${encodeURIComponent(orgId)}&event_id=${encodeURIComponent(eventId)}&sort=${sort}`,
    );
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos ?? []);
      setPending(data.pending ?? []);
      setRequireApproval(Boolean(data.album?.require_upload_approval));
    }
    setLoading(false);
  }, [orgId, eventId, sort]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  async function loadComments(photoId: string) {
    const res = await fetch(`/api/photos/${photoId}/comments`);
    if (res.ok) setComments(await res.json());
  }

  function openPhoto(p: GalleryPhoto) {
    setSelected(p);
    loadComments(p.id);
  }

  async function toggleLike(photo: GalleryPhoto) {
    const method = photo.liked_by_me ? "DELETE" : "POST";
    const res = await fetch(`/api/photos/${photo.id}/like`, { method });
    if (!res.ok) return;
    const { like_count, liked } = await res.json();
    const updater = (list: GalleryPhoto[]) =>
      list.map((p) => (p.id === photo.id ? { ...p, liked_by_me: liked, like_count } : p));
    setPhotos(updater);
    if (selected?.id === photo.id) {
      setSelected((s) => s ? { ...s, liked_by_me: liked, like_count } : s);
    }
  }

  async function saveOriginal(photo: GalleryPhoto) {
    const res = await fetch(`/api/photos/${photo.id}/download`);
    if (!res.ok) {
      toast.error("Could not prepare download — try again");
      return;
    }
    const { download_url } = await res.json();
    const a = document.createElement("a");
    a.href = download_url;
    a.download = photo.caption ?? `event-photo-${photo.id}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    toast.success("Saving full-quality file…");
  }

  async function postComment() {
    if (!selected || !commentBody.trim()) return;
    const res = await fetch(`/api/photos/${selected.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (!res.ok) {
      toast.error("Could not post comment");
      return;
    }
    setCommentBody("");
    await loadComments(selected.id);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("org_id", orgId);
      body.append("event_id", eventId);
      const res = await fetch("/api/events/gallery/upload", { method: "POST", body });
      if (res.ok) ok++;
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(ok === 1 ? "Uploaded!" : `${ok} files uploaded`);
      loadGallery();
    } else {
      toast.error("Upload failed — check file type and size");
    }
  }

  async function toggleApprovalSetting() {
    const next = !requireApproval;
    const res = await fetch("/api/events/gallery/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, eventId, requireUploadApproval: next }),
    });
    if (!res.ok) {
      toast.error("Could not update setting");
      return;
    }
    setRequireApproval(next);
    toast.success(next ? "Uploads need officer approval" : "Uploads go live instantly");
  }

  async function approveBatch() {
    const ids = Array.from(selectedPending);
    if (!ids.length) return;
    const res = await fetch("/api/events/gallery/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, photoIds: ids }),
    });
    if (!res.ok) {
      toast.error("Could not approve photos");
      return;
    }
    toast.success(`${ids.length} photo${ids.length === 1 ? "" : "s"} approved`);
    setSelectedPending(new Set());
    loadGallery();
  }

  function togglePendingSelect(id: string) {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader
        title="Photos & videos"
        icon={<ImageIcon size={16} />}
        description={`Memories from ${eventTitle}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={14} />}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 p-0.5 rounded-lg bg-surface-1 border border-border">
          <button
            type="button"
            onClick={() => setSort("recent")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${sort === "recent" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Most recent
          </button>
          <button
            type="button"
            onClick={() => setSort("likes")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${sort === "likes" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            Most liked
          </button>
        </div>
        {canManage && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer ml-auto">
            <input type="checkbox" checked={requireApproval} onChange={toggleApprovalSetting} className="rounded" />
            Require approval before photos go live
          </label>
        )}
      </div>

      {canApprove && pending.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">{pending.length} waiting for approval</p>
            <Button size="sm" icon={<Check size={14} />} onClick={approveBatch} disabled={selectedPending.size === 0}>
              Approve selected ({selectedPending.size})
            </Button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {pending.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePendingSelect(p.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 ${selectedPending.has(p.id) ? "border-greek-500" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                {selectedPending.has(p.id) && (
                  <div className="absolute inset-0 bg-greek-600/40 flex items-center justify-center">
                    <Check size={20} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={20} />}
          title="No photos yet"
          description="Upload shots from the event — full quality is kept when you save them."
          action={
            <Button size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              Add photos
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openPhoto(p)}
              className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 group"
            >
              {p.media_type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-black/80">
                  <Video size={28} className="text-white/80" />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.url} alt={p.caption ?? "Event photo"} className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-1 text-white text-[10px]">
                <Heart size={10} className={p.liked_by_me ? "fill-current" : ""} />
                {p.like_count}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.caption ?? "Photo"}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            {selected.media_type === "video" ? (
              <video src={selected.original_url ?? selected.url} controls className="w-full max-h-[50vh] rounded-xl bg-black" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selected.original_url ?? selected.url} alt="" className="w-full max-h-[50vh] object-contain rounded-xl bg-black/5" />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Heart size={14} className={selected.liked_by_me ? "fill-current text-red-500" : ""} />}
                onClick={() => toggleLike(selected)}
              >
                {selected.like_count} {selected.like_count === 1 ? "like" : "likes"}
              </Button>
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => saveOriginal(selected)}>
                Save full quality
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.uploader_name ?? "Member"} · {formatDateTime(selected.created_at)}
            </p>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1"><MessageCircle size={14} /> Comments</p>
              {comments.map((c) => (
                <div key={c.id} className="text-sm rounded-lg bg-surface-1 p-2">
                  <p className="font-medium text-xs">{c.author_name}</p>
                  <p className="text-foreground">{c.body}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[60px] flex-1"
                />
                <Button size="sm" onClick={postComment} disabled={!commentBody.trim()}>Post</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
