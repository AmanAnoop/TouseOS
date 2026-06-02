"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle, Download, Flag, Image, Plus, Star, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState,
  Modal, PageHeader, Tabs,
} from "@/components/ui";
import type { Photo, PhotoAlbum } from "@/types";
import { PhotoApprovalGrid } from "@/components/social/photo-approval-grid";

const APPROVAL_COLOR = {
  pending: "yellow",
  approved: "green",
  chapter_only: "blue",
  do_not_post: "red",
  flagged: "red",
  removed: "gray",
} as const;

export default function SocialPage() {
  const supabase = createClient();
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("albums");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [contentPackOpen, setContentPackOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAlbums = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("photo_albums")
      .select("*")
      .eq("org_id", oid)
      .order("created_at", { ascending: false });
    setAlbums((data ?? []) as PhotoAlbum[]);
    setLoading(false);
  }, [supabase]);

  const loadPhotos = useCallback(async (albumId: string) => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("album_id", albumId)
      .order("created_at", { ascending: false });
    setPhotos((data ?? []) as Photo[]);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); loadAlbums(m.org_id); }
    }
    init();
  }, [supabase, loadAlbums]);

  useEffect(() => {
    if (selectedAlbum) loadPhotos(selectedAlbum.id);
  }, [selectedAlbum, loadPhotos]);

  async function approvePhoto(id: string, status: string) {
    await supabase.from("photos").update({ status }).eq("id", id);
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: status as Photo["status"] } : p));
    toast.success(`Photo marked as ${status.replace("_", " ")}`);
  }

  async function uploadPhotos(files: FileList) {
    if (!orgId || !selectedAlbum) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      const path = `${orgId}/${selectedAlbum.id}/${Date.now()}-${file.name}`;

      const { data: stored, error } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: false });

      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(stored.path);

      await supabase.from("photos").insert({
        org_id: orgId,
        album_id: selectedAlbum.id,
        uploaded_by: user.id,
        storage_path: stored.path,
        url: urlData.publicUrl,
        status: "pending",
      });
    }

    setUploadProgress(0);
    loadPhotos(selectedAlbum.id);
    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded`);
  }

  function exportContentPack() {
    const selected = photos.filter((p) => selectedPhotos.includes(p.id));
    const manifest = [
      `TouseOS Content Pack — ${selectedAlbum?.title ?? "Album"}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `CAPTION:`,
      generatedCaption || "(no caption written)",
      ``,
      `PHOTOS (${selected.length}, in carousel order):`,
      ...selected.map((p, i) => `${i + 1}. ${p.url}`),
      ``,
      `PR COMPLIANCE: Review for alcohol, non-members, consent, and chapter guidelines before posting.`,
    ].join("\n");

    const blob = new Blob([manifest], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-pack-${(selectedAlbum?.title ?? "album").toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Content pack exported with ${selected.length} photos`);
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Touse Social"
        description="Event albums, photo approval, and Instagram content packs"
        action={
          selectedAlbum ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
                Upload photos
              </Button>
              <Button size="sm" icon={<Image size={14} />} onClick={() => setContentPackOpen(true)}>
                Content pack
              </Button>
            </div>
          ) : (
            <Button size="sm" icon={<Plus size={14} />} onClick={async () => {
              if (!orgId) return;
              const title = prompt("Album title?");
              if (!title) return;
              const { data } = await supabase.from("photo_albums").insert({ org_id: orgId, title }).select().single();
              if (data) { loadAlbums(orgId); setSelectedAlbum(data as PhotoAlbum); setTab("photos"); }
            }}>
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
          <div className="h-full bg-racing-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {!selectedAlbum ? (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video bg-surface-2 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <EmptyState icon={<Image size={24} />} title="No photo albums" description="Create an album for your next event." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => { setSelectedAlbum(album); setTab("photos"); }}
                  className="aspect-video relative rounded-xl overflow-hidden bg-racing-100 hover:scale-105 transition-transform text-left"
                >
                  {album.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover_url} alt={album.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-greek-400">
                      <Image size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-semibold truncate">{album.title}</p>
                    {album.is_public && <Badge label="Public" color="green" className="mt-1" />}
                  </div>
                </button>
              ))}
            </div>
          )}
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
              icon={<Image size={24} />}
              title={tab === "pending" ? "No photos pending review" : tab === "instagram" ? "No Instagram-ready photos yet" : "No photos yet"}
              description="Upload photos to get started."
              action={<Button size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Upload photos</Button>}
            />
          ) : tab === "pending" ? (
            <PhotoApprovalGrid photos={pendingPhotos} onApprove={approvePhoto} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(tab === "photos" ? photos : approvedPhotos).map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-surface-2">
                    <img
                      src={photo.url}
                      alt={photo.caption ?? ""}
                      className="w-full h-full object-cover"
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
                <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
                {selectedPhotos.includes(photo.id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-racing-500 flex items-center justify-center text-white text-xs font-bold">
                    {selectedPhotos.indexOf(photo.id) + 1}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Caption</p>
              <Button variant="ghost" size="sm" loading={generatingCaption} onClick={generateCaption}>Generate ✨</Button>
            </div>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Write your caption..."
              value={generatedCaption}
              onChange={(e) => setGeneratedCaption(e.target.value)}
            />
          </div>

          <Card padding="sm" className="bg-surface-1">
            <p className="text-xs font-semibold text-foreground mb-2">PR Compliance checklist</p>
            {[
              "Alcohol visible in any photos?",
              "Unsafe behavior visible?",
              "Non-members visible without consent?",
              "Sponsor tagged if applicable?",
              "Co-host chapter approved?",
              "Caption reviewed by PR chair?",
              "National/chapter guidelines followed?",
            ].map((item) => (
              <label key={item} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-xs text-muted-foreground">{item}</span>
              </label>
            ))}
          </Card>
        </div>
      </Modal>
    </div>
  );
}
