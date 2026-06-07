"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Download, Image as ImageIcon, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrg } from "@/hooks/use-org";
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { GreekChapterPicker } from "@/components/interchapter/greek-chapter-picker";

interface ChecklistItem {
  item: string;
  done: boolean;
}

interface CollabPost {
  id: string;
  partner_org_name: string;
  partner_org_id?: string | null;
  title: string;
  caption_draft: string | null;
  scheduled_date: string | null;
  status: string;
  checklist: ChecklistItem[];
  photo_ids?: string[];
  our_pr_approved?: boolean;
  partner_pr_approved?: boolean;
}

interface PartnerOrg {
  id: string;
  name: string;
}

interface ChapterPhoto {
  id: string;
  url: string;
}

export default function SocialCollabPage() {
  const router = useRouter();
  const { orgId } = useOrg();
  const [posts, setPosts] = useState<CollabPost[]>([]);
  const [photos, setPhotos] = useState<ChapterPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrg[]>([]);
  const [form, setForm] = useState({
    partnerOrgId: "", partnerOrgName: "", title: "", captionDraft: "", scheduledDate: "", photoIds: [] as string[],
  });
  const [photoEditPost, setPhotoEditPost] = useState<CollabPost | null>(null);
  const [editPhotoIds, setEditPhotoIds] = useState<string[]>([]);

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/social/collab?org_id=${oid}`);
    const data = await res.json();
    if (res.ok) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) {
      load(orgId);
      fetch(`/api/interchapter/orgs?exclude_org_id=${encodeURIComponent(orgId)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setPartnerOrgs((data as PartnerOrg[]).map((o) => ({ id: o.id, name: o.name }))));
      fetch(`/api/photos?org_id=${encodeURIComponent(orgId)}&limit=48`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setPhotos((data as ChapterPhoto[]).filter((p) => p.url)));
    }
  }, [orgId, load]);

  async function createCollab() {
    if (!orgId) return;
    const res = await fetch("/api/social/collab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        partnerOrgName: form.partnerOrgName || partnerOrgs.find((o) => o.id === form.partnerOrgId)?.name,
        partnerOrgId: form.partnerOrgId || null,
        title: form.title,
        captionDraft: form.captionDraft,
        scheduledDate: form.scheduledDate || null,
        photoIds: form.photoIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create collab");
      return;
    }
    toast.success("Collab post created");
    setOpen(false);
    setForm({ partnerOrgId: "", partnerOrgName: "", title: "", captionDraft: "", scheduledDate: "", photoIds: [] });
    load(orgId);
  }

  async function toggleChecklist(post: CollabPost, index: number) {
    if (!orgId) return;
    const checklist = (post.checklist ?? []).map((c, i) =>
      i === index ? { ...c, done: !c.done } : c,
    );
    const res = await fetch("/api/social/collab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, orgId, checklist }),
    });
    if (res.ok) load(orgId);
  }

  async function toggleApproval(post: CollabPost, field: "our_pr_approved" | "partner_pr_approved") {
    if (!orgId) return;
    await fetch("/api/social/collab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, orgId, [field]: !post[field] }),
    });
    load(orgId);
  }

  async function updateStatus(post: CollabPost, status: string) {
    if (!orgId) return;
    await fetch("/api/social/collab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, orgId, status }),
    });
    load(orgId);
    toast.success(`Marked ${status.replace("_", " ")}`);
  }

  async function savePhotos(post: CollabPost) {
    if (!orgId) return;
    await fetch("/api/social/collab", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, orgId, photoIds: editPhotoIds }),
    });
    setPhotoEditPost(null);
    load(orgId);
    toast.success("Photos linked");
  }

  async function scheduleOnCalendar(post: CollabPost) {
    if (!orgId) return;
    const res = await fetch("/api/social-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: post.title,
        caption: post.caption_draft,
        scheduledDate: post.scheduled_date,
        postType: "carousel",
        status: "draft",
        photoIds: post.photo_ids ?? [],
      }),
    });
    if (!res.ok) {
      toast.error("Could not add to social calendar");
      return;
    }
    toast.success("Added to social calendar");
    router.push("/social-calendar");
  }

  async function exportContentPack(post: CollabPost) {
    if (!orgId || !(post.photo_ids?.length)) {
      toast.error("Link photos first");
      return;
    }
    const res = await fetch("/api/social/content-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        photoIds: post.photo_ids,
        caption: post.caption_draft ?? post.title,
      }),
    });
    if (!res.ok) {
      toast.error("Export failed");
      return;
    }
    toast.success("Content pack ready — check Photos & posts");
    router.push("/social");
  }

  function photoPicker(selected: string[], onChange: (ids: string[]) => void) {
    if (photos.length === 0) return <p className="text-xs text-muted-foreground">Upload photos in Photos & posts first.</p>;
    return (
      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
        {photos.map((photo) => {
          const isSelected = selected.includes(photo.id);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onChange(isSelected ? selected.filter((id) => id !== photo.id) : [...selected, photo.id])}
              className={`aspect-square rounded-lg overflow-hidden border-2 ${isSelected ? "border-greek-500" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Collab post planner"
        description="Plan dual-chapter Instagram posts with photos, checklist, and caption draft"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setOpen(true)}>New collab</Button>}
      />

      {loading ? (
        <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No collab posts planned"
          description="Coordinate mixer recaps, philanthropy posts, or joint announcements with another chapter."
          action={<Button size="sm" onClick={() => setOpen(true)}>Plan collab</Button>}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="text-sm text-muted-foreground">with {post.partner_org_name}</p>
                  {post.scheduled_date && (
                    <p className="text-xs text-muted-foreground mt-1">Target: {formatDate(post.scheduled_date)}</p>
                  )}
                  {post.photo_ids && post.photo_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground">{post.photo_ids.length} photo(s) linked</p>
                  )}
                </div>
                <Badge label={post.status.replace("_", " ")} color="blue" />
              </div>
              {post.caption_draft && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3 border-l-2 border-greek-300 pl-3">
                  {post.caption_draft}
                </p>
              )}
              <div className="space-y-1.5 mb-3">
                {(post.checklist ?? []).map((item, i) => (
                  <label key={item.item} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(post, i)} />
                    <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.item}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => toggleApproval(post, "our_pr_approved")}
                  className={`text-xs px-2 py-1 rounded-full border ${post.our_pr_approved ? "bg-green-50 border-green-300 text-green-700" : "border-border text-muted-foreground"}`}
                >
                  Our PR {post.our_pr_approved ? "✓" : "pending"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleApproval(post, "partner_pr_approved")}
                  className={`text-xs px-2 py-1 rounded-full border ${post.partner_pr_approved ? "bg-green-50 border-green-300 text-green-700" : "border-border text-muted-foreground"}`}
                >
                  Partner PR {post.partner_pr_approved ? "✓" : "pending"}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" icon={<ImageIcon size={14} aria-hidden />} onClick={() => { setPhotoEditPost(post); setEditPhotoIds(post.photo_ids ?? []); }}>
                  Link photos
                </Button>
                <Button size="sm" variant="secondary" onClick={() => scheduleOnCalendar(post)}>Add to calendar</Button>
                <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportContentPack(post)}>Content pack</Button>
                {post.status === "planning" && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(post, "draft_ready")}>
                    Mark draft ready
                  </Button>
                )}
                {post.status !== "posted" && (
                  <Button size="sm" icon={<CheckCircle size={14} />} onClick={() => updateStatus(post, "posted")}>
                    Mark posted
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Plan collab post"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createCollab} disabled={!form.partnerOrgName && !form.partnerOrgId || !form.title}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {orgId ? (
            <GreekChapterPicker
              orgId={orgId}
              value={form.partnerOrgId}
              label="Partner chapter"
              onChange={(id, org) => setForm({
                ...form,
                partnerOrgId: id,
                partnerOrgName: org?.name ?? partnerOrgs.find((o) => o.id === id)?.name ?? form.partnerOrgName,
              })}
            />
          ) : (
            <Input label="Partner chapter" value={form.partnerOrgName} onChange={(e) => setForm({ ...form, partnerOrgName: e.target.value })} placeholder="Alpha Phi" />
          )}
          <Input label="Post title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Spring mixer recap collab" />
          <Input label="Target date" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          <Textarea label="Caption draft" value={form.captionDraft} onChange={(e) => setForm({ ...form, captionDraft: e.target.value })} className="min-h-[80px]" />
          <div>
            <p className="text-sm font-medium mb-2">Photos from your chapter</p>
            {photoPicker(form.photoIds, (photoIds) => setForm({ ...form, photoIds }))}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!photoEditPost}
        onClose={() => setPhotoEditPost(null)}
        title="Link photos"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPhotoEditPost(null)}>Cancel</Button>
            <Button onClick={() => photoEditPost && savePhotos(photoEditPost)}>Save</Button>
          </>
        }
      >
        {photoPicker(editPhotoIds, setEditPhotoIds)}
      </Modal>
    </div>
  );
}
