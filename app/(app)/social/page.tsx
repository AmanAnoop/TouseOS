"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { CheckCircle, Download, Flag, Image as ImageIcon, Plus, Star, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, EmptyState, Input,
  Modal, PageHeader, Tabs,
} from "@/components/ui";
import type { Photo, PhotoAlbum } from "@/types";
import { PhotoApprovalGrid } from "@/components/social/photo-approval-grid";
import { PhotoRequestsPanel } from "@/components/social/photo-requests-panel";
import { PrComplianceChecklist } from "@/components/social/pr-compliance-checklist";
import { ActivePhotoPrompts } from "@/components/social/active-photo-prompts";
import { PrComplianceHistory } from "@/components/social/pr-compliance-history";
import { useOrg } from "@/hooks/use-org";
import { formatDate } from "@/lib/utils";

const APPROVAL_COLOR = {
  pending: "yellow",
  approved: "green",
  chapter_only: "blue",
  do_not_post: "red",
  flagged: "red",
  removed: "gray",
} as const;

function SocialPageContent() {
  const searchParams = useSearchParams();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("albums");
  const [mainTab, setMainTab] = useState<"albums" | "requests" | "compliance">("albums");
  const [deepLinkReady, setDeepLinkReady] = useState(false);
  const { orgId } = useOrg();
  const [contentPackOpen, setContentPackOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const loadAlbums = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/photo-albums?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) setAlbums((await res.json()) as PhotoAlbum[]);
    setLoading(false);
  }, []);

  const loadPhotos = useCallback(async (albumId: string) => {
    const res = await fetch(`/api/photos?album_id=${encodeURIComponent(albumId)}`);
    if (res.ok) setPhotos((await res.json()) as Photo[]);
  }, []);

  useEffect(() => {
    if (orgId) loadAlbums(orgId);
  }, [orgId, loadAlbums]);

  useEffect(() => {
    if (selectedAlbum) loadPhotos(selectedAlbum.id);
  }, [selectedAlbum, loadPhotos]);

  useEffect(() => {
    if (!orgId || deepLinkReady) return;

    const eventId = searchParams.get("eventId");
    const albumId = searchParams.get("albumId");
    const wantUpload = searchParams.get("upload") === "1";

    if (!eventId && !albumId) {
      setDeepLinkReady(true);
      return;
    }

    async function openAlbum() {
      let targetAlbum: PhotoAlbum | undefined = albumId
        ? albums.find((a) => a.id === albumId)
        : eventId
          ? albums.find((a) => a.event_id === eventId)
          : undefined;

      if (!targetAlbum && eventId) {
        const res = await fetch(`/api/events/event-album?org_id=${orgId}&event_id=${eventId}`);
        const data = await res.json();
        if (res.ok && data.album) {
          const albumRes = await fetch(`/api/photo-albums?id=${encodeURIComponent(data.album.id)}`);
          if (albumRes.ok) targetAlbum = (await albumRes.json()) as PhotoAlbum;
          if (orgId) loadAlbums(orgId);
        }
      }

      if (targetAlbum) {
        setMainTab("albums");
        setSelectedAlbum(targetAlbum);
        if (wantUpload) {
          setTimeout(() => fileRef.current?.click(), 500);
        }
      }
      setDeepLinkReady(true);
    }

    openAlbum();
  }, [orgId, albums, searchParams, deepLinkReady, loadAlbums]);

  async function approvePhoto(id: string, status: string) {
    const res = await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: id, status }),
    });
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Update failed");
      return;
    }
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: status as Photo["status"] } : p));
    toast.success(`Photo marked as ${status.replace("_", " ")}`);
  }

  async function uploadPhotos(files: FileList) {
    if (!orgId || !selectedAlbum) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      const body = new FormData();
      body.append("file", file);
      body.append("org_id", orgId);

      const upRes = await fetch("/api/photos/upload", { method: "POST", body });
      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        toast.error((upData as { error?: string }).error ?? `Failed to upload ${file.name}`);
        continue;
      }

      const postRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          albumId: selectedAlbum.id,
          storagePath: (upData as { storagePath: string }).storagePath,
        }),
      });
      if (!postRes.ok) {
        toast.error((await postRes.json().catch(() => ({}))).error ?? `Failed to save ${file.name}`);
      }
    }

    setUploadProgress(0);
    loadPhotos(selectedAlbum.id);
    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded`);
  }

  async function exportContentPack() {
    if (!orgId || selectedPhotos.length === 0) {
      toast.error("Select at least one approved photo for the pack");
      return;
    }
    const res = await fetch("/api/social/content-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        photoIds: selectedPhotos,
        caption: generatedCaption,
        albumTitle: selectedAlbum?.title,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]
      ?? `content-pack-${(selectedAlbum?.title ?? "album").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`ZIP content pack with ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? "s" : ""}`);
  }

  async function generateCaption() {
    const albumTitle = selectedAlbum?.title ?? "event";
    const photoCount = selectedPhotos.length;
    const fallbackTemplates = [
      `What a night ✨ ${albumTitle} was everything. So grateful for this chapter 💚 #GreekLife #Brotherhood`,
      `The best people 🤍 ${albumTitle} forever in our hearts. Tag someone who was there!`,
      `Memories that last a lifetime 📸 #ChapterLife #TouseGreek`,
    ];

    setGeneratingCaption(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          messages: [{
            role: "user",
            content: `Write an Instagram caption for a Greek life chapter post. Album/event: "${albumTitle}". ${photoCount > 0 ? `Carousel with ${photoCount} photos.` : "Single or carousel post."} Keep it authentic, warm, and under 2200 characters. Include 2-4 relevant hashtags. Do not use quotation marks around the caption.`,
          }],
        }),
      });

      const data = await res.json();
      if (res.ok && data.response) {
        setGeneratedCaption(data.response.trim());
        toast.success("AI caption generated — review before posting");
      } else {
        setGeneratedCaption(fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]);
        toast.error(data.error ?? "AI unavailable — using template caption");
      }
    } catch {
      setGeneratedCaption(fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]);
      toast.error("AI unavailable — using template caption");
    } finally {
      setGeneratingCaption(false);
    }
  }

  const approvedPhotos = photos.filter((p) => p.is_instagram_ready);
  const pendingPhotos = photos.filter((p) => p.status === "pending");

  async function createAlbum() {
    if (!orgId || !albumTitle.trim()) return;
    setCreatingAlbum(true);
    const res = await fetch("/api/photo-albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, title: albumTitle.trim() }),
    });
    setCreatingAlbum(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Could not create album");
      return;
    }
    const data = (await res.json()) as PhotoAlbum;
    toast.success("Album created");
    setAlbumOpen(false);
    setAlbumTitle("");
    loadAlbums(orgId);
    setSelectedAlbum(data);
    setTab("photos");
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Touse Social"
        description="Event albums, photo approval, and Instagram content packs"
        action={
          selectedAlbum ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="officer-touch" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
                Upload photos
              </Button>
              <Button size="sm" className="officer-touch" icon={<ImageIcon size={14} aria-hidden />} onClick={() => setContentPackOpen(true)}>
                Content pack
              </Button>
            </div>
          ) : (
            <Button size="sm" className="officer-touch" icon={<Plus size={14} />} onClick={() => setAlbumOpen(true)}>
              New album
            </Button>
          )
        }
      />

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
      />

      {uploadProgress > 0 && (
        <div className="w-full h-1.5 bg-surface-2 rounded-full">
          <div className="h-full bg-greek-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {orgId && <ActivePhotoPrompts orgId={orgId} />}

      {!selectedAlbum ? (
        <>
          <Tabs
            tabs={[
              { id: "albums", label: "Albums" },
              { id: "requests", label: "Photo requests" },
              { id: "compliance", label: "PR compliance" },
            ]}
            active={mainTab}
            onChange={(id) => setMainTab(id as "albums" | "requests" | "compliance")}
          />

          {mainTab === "compliance" && orgId ? (
            <PrComplianceHistory orgId={orgId} />
          ) : mainTab === "requests" && orgId ? (
            <PhotoRequestsPanel orgId={orgId} />
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video bg-surface-2 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : mainTab === "albums" && albums.length === 0 ? (
            <EmptyState icon={<ImageIcon size={24} aria-hidden />} title="No photo albums" description="Create an album for your next event." />
          ) : mainTab === "albums" ? (
            <div className="space-y-2">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => { setSelectedAlbum(album); setTab("photos"); }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl border border-border bg-card hover:border-greek-300 hover:bg-surface-1 transition-colors text-left"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-greek-100 dark:bg-greek-950/30 flex-shrink-0">
                    {album.cover_url ? (
                      <NextImage
                        src={album.cover_url}
                        alt={album.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-greek-400">
                        <ImageIcon size={18} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{album.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(album.created_at)}</p>
                  </div>
                  {album.is_public && <Badge label="Public" color="green" />}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <button
            onClick={() => { setSelectedAlbum(null); setPhotos([]); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to albums
          </button>

          <Tabs
            tabs={[
              { id: "photos", label: "All photos", count: photos.length },
              { id: "pending", label: "Pending approval", count: pendingPhotos.length },
              { id: "instagram", label: "Instagram ready", count: approvedPhotos.length },
            ]}
            active={tab}
            onChange={setTab}
          />

          {(tab === "photos" ? photos : tab === "pending" ? pendingPhotos : approvedPhotos).length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={24} aria-hidden />}
              title={tab === "pending" ? "No photos pending review" : tab === "instagram" ? "No Instagram-ready photos yet" : "No photos yet"}
              description="Upload photos to get started."
              action={<Button size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Upload photos</Button>}
            />
          ) : tab === "pending" ? (
            <PhotoApprovalGrid photos={pendingPhotos} onApprove={approvePhoto} />
          ) : (
            <div
              className={`rounded-xl border-2 border-dashed p-3 transition-colors ${dragOver ? "border-greek-500 bg-greek-50/50 dark:bg-greek-950/20" : "border-transparent"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) uploadPhotos(e.dataTransfer.files);
              }}
            >
              {dragOver && (
                <p className="text-center text-sm text-greek-600 font-medium py-2 mb-2">Drop photos to upload</p>
              )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(tab === "photos" ? photos : approvedPhotos).map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                    <NextImage
                      src={photo.url}
                      alt={photo.caption?.trim() || "Chapter photo"}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  </div>

                  {/* Status overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      label={photo.status.replace("_", " ")}
                      color={APPROVAL_COLOR[photo.status] as "green"}
                    />
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => approvePhoto(photo.id, "approved")}
                      className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600"
                      title="Approve"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      onClick={() => approvePhoto(photo.id, "chapter_only")}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                      title="Chapter only"
                    >
                      <Star size={14} />
                    </button>
                    <button
                      onClick={() => approvePhoto(photo.id, "do_not_post")}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                      title="Do not post"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => approvePhoto(photo.id, "flagged")}
                      className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600"
                      title="Flag for review"
                    >
                      <Flag size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </>
      )}

      {/* Content pack modal */}
      <Modal
        open={contentPackOpen}
        onClose={() => setContentPackOpen(false)}
        title="Instagram content pack"
        description="Select photos and generate captions for your next post."
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setContentPackOpen(false)}>Close</Button>
            <Button icon={<Download size={14} />} onClick={exportContentPack}>
              Export ZIP
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {approvedPhotos.length} photos approved for Instagram. Select photos for carousel.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhotos((prev) =>
                  prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id],
                )}
                className={`aspect-square rounded-lg overflow-hidden relative ${selectedPhotos.includes(photo.id) ? "ring-2 ring-greek-500" : ""}`}
              >
                <NextImage
                  src={photo.url}
                  alt={photo.caption?.trim() || "Chapter photo"}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="120px"
                />
                {selectedPhotos.includes(photo.id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-greek-500 flex items-center justify-center text-white text-xs font-bold">
                    {selectedPhotos.indexOf(photo.id) + 1}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Caption</p>
              <Button variant="ghost" size="sm" loading={generatingCaption} onClick={generateCaption}>Generate caption</Button>
            </div>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Write your caption..."
              value={generatedCaption}
              onChange={(e) => setGeneratedCaption(e.target.value)}
            />
          </div>

          {orgId && (
            <PrComplianceChecklist
              orgId={orgId}
              photoIds={selectedPhotos}
              onApproved={() => toast.success("Ready to export content pack")}
            />
          )}
        </div>
      </Modal>

      <Modal
        open={albumOpen}
        onClose={() => { setAlbumOpen(false); setAlbumTitle(""); }}
        title="New photo album"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAlbumOpen(false); setAlbumTitle(""); }}>Cancel</Button>
            <Button loading={creatingAlbum} onClick={createAlbum} disabled={!albumTitle.trim()}>Create album</Button>
          </>
        }
      >
        <Input
          label="Album title"
          placeholder="Spring formal 2026"
          value={albumTitle}
          onChange={(e) => setAlbumTitle(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <SocialPageContent />
    </Suspense>
  );
}
