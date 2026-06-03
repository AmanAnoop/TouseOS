"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar, CheckCircle, Clock
,
  Instagram, Plus
,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge, Button, Card
, EmptyState, Input,
  Modal, PageHeader, Tabs, Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

interface CalendarPost {
  id: string;
  org_id: string;
  title: string;
  caption: string | null;
  scheduled_date: string | null;
  post_type: string;
  status: string;
  platform: string[];
  created_at: string;
}

const POST_TYPES = [
  { value: "feed", label: "📸 Feed post", icon: "📸" },
  { value: "story", label: "⭕ Story", icon: "⭕" },
  { value: "reel", label: "🎬 Reel", icon: "🎬" },
  { value: "carousel", label: "🖼️ Carousel", icon: "🖼️" },
];

const CAPTION_TEMPLATES = [
  { label: "Mixer recap", text: "What a night ✨ [Event name] brought out the best in us 💚 Grateful for every single one of you. See you next time! #GreekLife" },
  { label: "Philanthropy", text: "So proud of our chapter for raising $[amount] for [cause] 🙌 Every dollar makes a difference. Thank you to everyone who contributed! 💚" },
  { label: "Senior spotlight", text: "We are so proud to spotlight [Name] 🌟 [Name] has been an incredible member of our chapter and will go on to do amazing things. We love you! 💚" },
  { label: "Bid day", text: "Welcome to the family 🎉 We are SO excited to welcome [names] to our chapter! Your story starts now 💚 #BidDay #NewMembers" },
  { label: "Recruitment", text: "🌟 Recruitment is OPEN! If you&apos;ve been thinking about Greek life, now is your chance. DM us or visit the link in bio to learn more 💚" },
  { label: "Event announcement", text: "📣 Mark your calendars! [Event name] is coming up on [date] at [location]. RSVP in the app! 💚" },
];

export default function SocialCalendarPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("calendar");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", caption: "", scheduledDate: "",
    postType: "feed", status: "draft",
  });

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/social-calendar?org_id=${encodeURIComponent(oid)}`);
    setPosts(res.ok ? ((await res.json()) as CalendarPost[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (orgId) load(orgId);
  }, [orgId, load]);

  useEffect(() => {
    const title = searchParams.get("title");
    const caption = searchParams.get("caption");
    if (!title && !caption) return;

    setForm((f) => ({
      ...f,
      title: title ?? f.title,
      caption: caption ?? f.caption,
    }));
    setCreateOpen(true);
    setTab("drafts");
  }, [searchParams]);

  async function createPost() {
    if (!orgId || !form.title) return;
    const res = await fetch("/api/social-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        caption: form.caption,
        scheduledDate: form.scheduledDate,
        postType: form.postType,
        status: form.status,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to create post");
      return;
    }
    toast.success("Post scheduled!");
    setCreateOpen(false);
    setForm({ title: "", caption: "", scheduledDate: "", postType: "feed", status: "draft" });
    load(orgId);
  }

  async function updateStatus(id: string, status: string) {
    if (!orgId) return;
    const res = await fetch("/api/social-calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, orgId, status }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    toast.success(`Post ${status}`);
  }

  const upcoming = posts.filter((p) => p.status !== "posted" && p.scheduled_date && new Date(p.scheduled_date) >= new Date());
  const drafts = posts.filter((p) => p.status === "draft");
  const posted = posts.filter((p) => p.status === "posted");

  const STATUS_COLOR: Record<string, string> = {
    draft: "gray", scheduled: "blue", posted: "green", cancelled: "red",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Social Media Calendar"
        description="Plan, draft, and schedule Instagram content"
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Schedule post</Button>}
      />

      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-xl font-bold text-foreground">{drafts.length}</p>
          <p className="text-xs text-muted-foreground">Drafts</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-bold text-foreground">{upcoming.length}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xl font-bold text-foreground">{posted.length}</p>
          <p className="text-xs text-muted-foreground">Posted</p>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: "calendar", label: "Upcoming", count: upcoming.length },
          { id: "drafts", label: "Drafts", count: drafts.length },
          { id: "templates", label: "Caption templates" },
          { id: "posted", label: "Posted", count: posted.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "templates" ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {CAPTION_TEMPLATES.map((tpl) => (
            <Card key={tpl.label} padding="sm" className="hover:border-greek-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{tpl.text}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  setForm((f) => ({ ...f, title: tpl.label, caption: tpl.text }));
                  setCreateOpen(true);
                }}
              >
                Use template
              </Button>
            </Card>
          ))}
        </div>
      ) : loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : (tab === "calendar" ? upcoming : tab === "drafts" ? drafts : posted).length === 0 ? (
        <EmptyState
          icon={<Instagram size={24} />}
          title={tab === "calendar" ? "No scheduled posts" : tab === "drafts" ? "No drafts" : "No posts yet"}
          action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Schedule post</Button>}
        />
      ) : (
        <div className="space-y-2">
          {(tab === "calendar" ? upcoming : tab === "drafts" ? drafts : posted).map((post) => (
            <Card key={post.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-base flex-shrink-0">
                  {POST_TYPES.find((t) => t.value === post.post_type)?.icon ?? "📸"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{post.title}</p>
                    <Badge label={post.status} color={STATUS_COLOR[post.status] as "green"} />
                  </div>
                  {post.caption && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{post.caption}</p>}
                  {post.scheduled_date && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar size={11} />
                      {formatDate(post.scheduled_date)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {post.status === "draft" && (
                    <Button size="sm" variant="secondary" icon={<Clock size={12} />} onClick={() => updateStatus(post.id, "scheduled")}>Schedule</Button>
                  )}
                  {post.status === "scheduled" && (
                    <Button size="sm" icon={<CheckCircle size={12} />} onClick={() => updateStatus(post.id, "posted")}>Posted</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule post"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createPost} disabled={!form.title}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Post title" placeholder="Spring Mixer recap" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Post type</label>
              <div className="flex gap-2 flex-wrap">
                {POST_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setForm({ ...form, postType: t.value })} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${form.postType === t.value ? "bg-pink-500 text-white border-pink-500" : "border-border text-muted-foreground hover:border-pink-400"}`}>
                    {t.icon} {t.label.split(" ")[1]}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Scheduled date" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>
          <Textarea
            label="Caption"
            placeholder="Write your caption... Use templates above for inspiration."
            value={form.caption}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            {form.caption.length}/2200 characters · TIP: Captions over 125 chars get cut off in feed view.
          </p>
        </div>
      </Modal>
    </div>
  );
}
