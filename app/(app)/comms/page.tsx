"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, Mail, MessageSquare, Phone, Plus, Send, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Avatar, Badge, Button, Card, CardHeader,
  EmptyState, Modal, PageHeader, SearchInput, Tabs, Textarea,
} from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Announcement } from "@/types";

const AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "officers", label: "Officers only" },
  { value: "new_members", label: "New members" },
  { value: "unpaid", label: "Unpaid members" },
  { value: "alumni", label: "Alumni/Alumnae" },
];

export default function CommsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailBlastOpen, setEmailBlastOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [draft, setDraft] = useState({
    title: "", body: "", audience: "all", pinned: false,
  });

  const [emailDraft, setEmailDraft] = useState({
    subject: "", body: "", audience: "all",
  });

  const loadAnnouncements = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("org_id", oid)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setAnnouncements((data ?? []) as Announcement[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [mRes, pRes] = await Promise.all([
        supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);
      if (mRes.data) { setOrgId(mRes.data.org_id); loadAnnouncements(mRes.data.org_id); }
      if (pRes.data) setUserProfile({ name: String(pRes.data.full_name) });
    }
    init();
  }, [supabase, loadAnnouncements]);

  async function postAnnouncement() {
    if (!orgId || !draft.title || !draft.body) return;
    const { error } = await supabase.from("announcements").insert({
      org_id: orgId,
      author_name: userProfile?.name ?? "Officer",
      title: draft.title,
      body: draft.body,
      audience: [draft.audience],
      pinned: draft.pinned,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted");
    setComposeOpen(false);
    setDraft({ title: "", body: "", audience: "all", pinned: false });
    loadAnnouncements(orgId);
  }

  async function sendEmailBlast() {
    if (!orgId || !emailDraft.subject || !emailDraft.body) return;
    const res = await fetch("/api/comms/email-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...emailDraft }),
    });
    if (res.ok) {
      toast.success("Email blast queued");
      setEmailBlastOpen(false);
    } else toast.error("Failed to send");
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = announcements.filter((a) =>
    !query || a.title.toLowerCase().includes(query.toLowerCase()) || a.body.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Communications"
        description="Announcements, email blasts, and message templates"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Mail size={14} />} onClick={() => setEmailBlastOpen(true)}>
              Email blast
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setComposeOpen(true)}>
              Announcement
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: "announcements", label: "Announcements", count: announcements.length },
          { id: "templates", label: "Templates" },
          { id: "schedule", label: "Scheduled" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "announcements" && (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search announcements..." />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} padding="sm">
                  <div className="space-y-2">
                    <div className="h-4 bg-surface-2 rounded animate-pulse w-48" />
                    <div className="h-3 bg-surface-2 rounded animate-pulse w-full" />
                    <div className="h-3 bg-surface-2 rounded animate-pulse w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Bell size={20} />}
              title="No announcements yet"
              description="Post an announcement to reach your members."
              action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setComposeOpen(true)}>Post announcement</Button>}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <Card key={a.id} padding="sm">
                  <div className="flex items-start gap-3">
                    <Avatar name={a.author_name ?? "?"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        {a.pinned && <Badge label="Pinned" color="yellow" />}
                        <Badge
                          label={(a.audience?.[0] ?? "all").replace("_", " ")}
                          color="blue"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">{a.author_name ?? "Officer"} · {timeAgo(a.created_at)}</p>
                        <button
                          onClick={() => deleteAnnouncement(a.id)}
                          className="text-xs text-muted-foreground hover:text-red-500 ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: "Event reminder", body: "Reminder: [Event Name] is tomorrow at [Time] at [Location]. Please RSVP if you haven't yet!" },
            { name: "Payment reminder", body: "Friendly reminder that [Dues Description] of $[Amount] is due by [Date]. Please pay via the Dues tab." },
            { name: "Meeting agenda", body: "Chapter meeting this [Day] at [Time] in [Location].\n\nAgenda:\n1. Officer reports\n2. [Item]\n3. [Item]\n\nSee you there!" },
            { name: "Event recap", body: "Thank you to everyone who came to [Event]! It was an amazing night. Check the app for photos!" },
            { name: "Welcome new members", body: "Please join us in welcoming our new members to the chapter! We're so excited to have you 🎉" },
            { name: "Emergency broadcast", body: "🚨 IMPORTANT CHAPTER UPDATE: [Message]. Please respond immediately and check your email for more details." },
          ].map((template) => (
            <Card key={template.name} padding="sm" className="cursor-pointer hover:border-greek-300 transition-colors" onClick={() => {
              setDraft({ ...draft, body: template.body, title: template.name });
              setComposeOpen(true);
            }}>
              <p className="font-semibold text-sm text-foreground">{template.name}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.body}</p>
              <p className="text-xs text-greek-600 mt-2">Use template →</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-4">
          <Alert type="info" title="Scheduled messages coming soon" description="Schedule announcements and email blasts in advance. Messages will be sent at your chosen time." />
          <Card>
            <CardHeader title="Audience segments" description="Available for announcements and email blasts" />
            <div className="space-y-2">
              {[
                { label: "All members", icon: <Users size={14} />, description: "Every active member in your org" },
                { label: "Officers only", icon: <Bell size={14} />, description: "Exec board and committee chairs" },
                { label: "New members", icon: <Users size={14} />, description: "Members with new member status" },
                { label: "Unpaid members", icon: <Bell size={14} />, description: "Members with outstanding dues" },
                { label: "Alumni/Alumnae", icon: <Users size={14} />, description: "Alumni members" },
                { label: "PNMs", icon: <MessageSquare size={14} />, description: "Opted-in potential new members (SMS)" },
                { label: "Event attendees", icon: <Users size={14} />, description: "Members who RSVPed to a specific event" },
                { label: "Sports travel roster", icon: <Phone size={14} />, description: "Players confirmed for a trip" },
              ].map((seg) => (
                <div key={seg.label} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                  <div className="w-7 h-7 rounded-md bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600">
                    {seg.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{seg.label}</p>
                    <p className="text-xs text-muted-foreground">{seg.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Compose modal */}
      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Post announcement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={postAnnouncement} disabled={!draft.title || !draft.body} icon={<Send size={14} />}>Post</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Title</label>
            <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Announcement title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <Textarea label="Message" placeholder="Write your announcement..." value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-[120px]" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Audience</label>
            <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
            <span className="text-sm">Pin this announcement</span>
          </label>
        </div>
      </Modal>

      {/* Email blast modal */}
      <Modal
        open={emailBlastOpen}
        onClose={() => setEmailBlastOpen(false)}
        title="Send email blast"
        description="Compose a bulk email to your selected audience."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailBlastOpen(false)}>Cancel</Button>
            <Button onClick={sendEmailBlast} disabled={!emailDraft.subject || !emailDraft.body} icon={<Mail size={14} />}>Send email blast</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Subject line</label>
            <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Chapter update - Spring Formal" value={emailDraft.subject} onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Audience</label>
            <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={emailDraft.audience} onChange={(e) => setEmailDraft({ ...emailDraft, audience: e.target.value })}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <Textarea label="Email body" placeholder="Write your email..." value={emailDraft.body} onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })} className="min-h-[180px]" />
          <Alert type="info" title="Emails will be sent via your configured email provider." />
        </div>
      </Modal>
    </div>
  );
}
