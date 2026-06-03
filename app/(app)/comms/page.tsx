"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Plus, Send,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Alert, Button, Card,
  Modal, PageHeader, SearchInput, Tabs, Textarea,
} from "@/components/ui";
import type { Announcement } from "@/types";
import { AnnouncementFeed, COMMS_AUDIENCES } from "@/components/comms/announcement-feed";
import { ScheduledMessagesPanel } from "@/components/comms/scheduled-messages-panel";
import { CommsAnalyticsPanel } from "@/components/comms/comms-analytics-panel";
import { useOrg } from "@/hooks/use-org";

export default function CommsPage() {
  const { orgId } = useOrg();
  const [tab, setTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailBlastOpen, setEmailBlastOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [draft, setDraft] = useState({
    title: "", body: "", audience: "all", pinned: false,
  });

  const [emailDraft, setEmailDraft] = useState({
    subject: "", body: "", audience: "all",
  });
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsDraft, setSmsDraft] = useState({ body: "", audience: "active" });
  const [scheduledMessages, setScheduledMessages] = useState<Array<Record<string, unknown>>>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState({
    channel: "announcement", title: "", body: "", audience: "all", scheduledFor: "",
  });
  const [twilioLive, setTwilioLive] = useState<boolean | null>(null);

  const loadScheduled = useCallback(async (oid: string) => {
    const res = await fetch(`/api/comms/schedule?orgId=${oid}`);
    if (res.ok) {
      const { messages } = await res.json();
      setScheduledMessages(messages ?? []);
    }
    // Process any due messages
    await fetch("/api/comms/process-scheduled", { method: "POST" });
    const res2 = await fetch(`/api/comms/schedule?orgId=${oid}`);
    if (res2.ok) {
      const { messages } = await res2.json();
      setScheduledMessages(messages ?? []);
    }
  }, []);

  const loadAnnouncements = useCallback(async (oid: string) => {
    setLoading(true);
    const res = await fetch(`/api/comms/announcements?org_id=${encodeURIComponent(oid)}`);
    if (res.ok) {
      setAnnouncements((await res.json()) as Announcement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const twilio = data?.integrations?.find((i: { id: string }) => i.id === "twilio");
        setTwilioLive(Boolean(twilio?.live));
      })
      .catch(() => setTwilioLive(false));
  }, []);

  useEffect(() => {
    if (!orgId) return;
    loadAnnouncements(orgId);
    loadScheduled(orgId);
  }, [orgId, loadAnnouncements, loadScheduled]);

  async function postAnnouncement() {
    if (!orgId || !draft.title || !draft.body) return;
    const res = await fetch("/api/comms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: draft.title,
        body: draft.body,
        audience: draft.audience,
        pinned: draft.pinned,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Failed to post"); return; }
    toast.success("Announcement posted");
    setComposeOpen(false);
    setDraft({ title: "", body: "", audience: "all", pinned: false });
    loadAnnouncements(orgId);
  }

  async function scheduleMessage() {
    if (!orgId || !scheduleDraft.body || !scheduleDraft.scheduledFor) return;
    const res = await fetch("/api/comms/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...scheduleDraft }),
    });
    if (res.ok) {
      toast.success("Message scheduled");
      setScheduleOpen(false);
      setScheduleDraft({ channel: "announcement", title: "", body: "", audience: "all", scheduledFor: "" });
      loadScheduled(orgId);
    } else toast.error("Failed to schedule");
  }

  async function cancelScheduled(id: string) {
    await fetch(`/api/comms/schedule?id=${id}`, { method: "DELETE" });
    if (orgId) loadScheduled(orgId);
    toast.success("Cancelled");
  }

  async function sendSmsBlast() {
    if (!orgId || !smsDraft.body.trim()) return;
    const res = await fetch("/api/comms/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, body: smsDraft.body, audience: smsDraft.audience, channel: "sms" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to send SMS");
      return;
    }
    toast.success(data.message ?? "SMS sent");
    setSmsOpen(false);
    setSmsDraft({ body: "", audience: "active" });
  }

  async function sendEmailBlast() {
    if (!orgId || !emailDraft.subject || !emailDraft.body) return;
    const res = await fetch("/api/comms/email-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...emailDraft }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.message ?? "Email blast sent");
      setEmailBlastOpen(false);
    } else toast.error("Failed to send");
  }



  return (
    <div className="space-y-5">
      <PageHeader
        title="Communications"
        description="Announcements, email blasts, and message templates"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="officer-touch"
              onClick={() => setSmsOpen(true)}
              disabled={twilioLive === false}
              title={twilioLive === false ? "Configure Twilio in Settings → Integrations" : undefined}
            >
              SMS blast
            </Button>
            <Button variant="secondary" size="sm" className="officer-touch" icon={<Mail size={14} />} onClick={() => setEmailBlastOpen(true)}>
              Email blast
            </Button>
            <Button size="sm" className="officer-touch" icon={<Plus size={14} />} onClick={() => setComposeOpen(true)}>
              Announcement
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: "analytics", label: "Analytics" },
          { id: "announcements", label: "Announcements", count: announcements.length },
          { id: "templates", label: "Templates" },
          { id: "schedule", label: "Scheduled" },
          { id: "sms", label: "SMS" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "analytics" && orgId && (
        <CommsAnalyticsPanel orgId={orgId} />
      )}

      {tab === "announcements" && (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search announcements..." />
          <AnnouncementFeed announcements={announcements} loading={loading} query={query} />
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
        <ScheduledMessagesPanel
          messages={scheduledMessages as Array<{ id: string; title?: string | null; body: string; channel: string; scheduled_for: string; status: string }>}
          onSchedule={() => setScheduleOpen(true)}
          onCancel={cancelScheduled}
        />
      )}

      {tab === "sms" && (
        <Card>
          {twilioLive === false && (
            <Alert
              type="warning"
              title="Twilio SMS not configured"
              description="Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID in your deployment. See Settings → Integrations."
              className="mb-3"
            />
          )}
          {twilioLive === true && (
            <Alert type="success" title="Twilio connected" description="SMS blasts will send to active members with phone numbers on file." className="mb-3" />
          )}
          <p className="text-sm text-muted-foreground mb-3">
            Quiet hours (9pm–9am) apply. Members must have a phone number on their roster profile.
          </p>
          <Button size="sm" onClick={() => setSmsOpen(true)} disabled={twilioLive === false}>
            Compose SMS blast
          </Button>
        </Card>
      )}

      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title="SMS blast" footer={
        <>
          <Button variant="secondary" onClick={() => setSmsOpen(false)}>Cancel</Button>
          <Button onClick={sendSmsBlast} disabled={!smsDraft.body.trim()}>Send SMS</Button>
        </>
      }>
        <div className="space-y-3">
          <Textarea label="Message" value={smsDraft.body} onChange={(e) => setSmsDraft({ ...smsDraft, body: e.target.value })} placeholder="Chapter meeting tomorrow at 7pm..." />
          <Alert type="warning" title="Only members with phone numbers receive SMS. PNM texting remains on the PNM page with consent tracking." />
        </div>
      </Modal>

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
              {COMMS_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
            <span className="text-sm">Pin this announcement</span>
          </label>
        </div>
      </Modal>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule message" footer={<><Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button onClick={scheduleMessage} disabled={!scheduleDraft.body || !scheduleDraft.scheduledFor}>Schedule</Button></>}>
        <div className="space-y-3">
          <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" value={scheduleDraft.channel} onChange={(e) => setScheduleDraft({ ...scheduleDraft, channel: e.target.value })}>
            <option value="announcement">In-app announcement</option>
            <option value="email">Email blast</option>
            <option value="sms" disabled={twilioLive === false}>SMS blast (Twilio)</option>
          </select>
          {scheduleDraft.channel === "sms" && twilioLive === false && (
            <Alert type="warning" title="Configure Twilio before scheduling SMS" />
          )}
          <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Title / subject" value={scheduleDraft.title} onChange={(e) => setScheduleDraft({ ...scheduleDraft, title: e.target.value })} />
          <Textarea placeholder="Message body..." value={scheduleDraft.body} onChange={(e) => setScheduleDraft({ ...scheduleDraft, body: e.target.value })} />
          <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" value={scheduleDraft.audience} onChange={(e) => setScheduleDraft({ ...scheduleDraft, audience: e.target.value })}>
            {COMMS_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <input type="datetime-local" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" value={scheduleDraft.scheduledFor} onChange={(e) => setScheduleDraft({ ...scheduleDraft, scheduledFor: e.target.value })} />
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
              {COMMS_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <Textarea label="Email body" placeholder="Write your email..." value={emailDraft.body} onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })} className="min-h-[180px]" />
          <Alert type="info" title="Emails will be sent via your configured email provider." />
        </div>
      </Modal>
    </div>
  );
}
