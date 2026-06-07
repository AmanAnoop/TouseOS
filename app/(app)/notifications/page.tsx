"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";
import { PushSettingsPanel } from "@/components/notifications/push-settings-panel";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

const TYPE_ICON: Record<string, string> = {
  event_reminder: "📅",
  payment_reminder: "💳",
  pnm_follow_up: "💬",
  form_missing: "📋",
  task_due: "✅",
  reimbursement_status: "💵",
  photo_approval: "📸",
  interchapter_proposal: "🤝",
  social_calendar: "📅",
  travel_alert: "✈️",
  waiver_missing: "📄",
  officer_handoff: "🔑",
  new_match: "💚",
  match_message: "💬",
  general: "🔔",
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState("unread");
  const [channels, setChannels] = useState({ email: true, sms: true, push: false });
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notifications?limit=50");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load();

      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_email, notification_sms, notification_push, notification_preferences")
        .eq("id", user.id)
        .single();

      if (profile) {
        setChannels({
          email: Boolean(profile.notification_email ?? true),
          sms: Boolean(profile.notification_sms ?? true),
          push: Boolean(profile.notification_push ?? false),
        });
        setPreferences(parseNotificationPreferences(profile.notification_preferences));
      }

      const channel = supabase
        .channel("notifications")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [supabase, load]);

  async function markRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: readAt } : n));
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? readAt })));
  }

  async function savePreferences() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      notification_email: channels.email,
      notification_sms: channels.sms,
      notification_push: channels.push,
      notification_preferences: preferences,
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notification preferences saved");
  }

  const unread = notifications.filter((n) => !n.read_at);
  const filtered = tab === "unread" ? unread : notifications;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageHeader
        title="Notifications"
        description={unread.length > 0 ? `${unread.length} unread` : "All caught up!"}
        action={
          unread.length > 0 ? (
            <Button variant="secondary" size="sm" className="officer-touch" icon={<CheckCheck size={14} />} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: "unread", label: "Unread", count: unread.length },
          { id: "all", label: "All", count: notifications.length },
          { id: "settings", label: "Settings" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "settings" ? (
        <div className="space-y-4">
          <PushSettingsPanel />
          <NotificationPreferencesForm
            preferences={preferences}
            channels={channels}
            onChannelChange={(key, value) => setChannels({ ...channels, [key]: value })}
            onPreferenceChange={(key, value) => setPreferences({ ...preferences, [key]: value })}
            onSave={savePreferences}
            saving={saving}
          />
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-surface-2 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={24} />}
          title={tab === "unread" ? "No unread notifications" : "No notifications"}
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.read_at) markRead(n.id); if (n.link) window.location.href = n.link; }}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${n.read_at ? "bg-card border-border" : "bg-greek-50 dark:bg-greek-950/20 border-greek-200 dark:border-greek-800"}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? TYPE_ICON.general}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.read_at ? "text-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                  {!n.read_at && <div className="w-2 h-2 rounded-full bg-greek-600 flex-shrink-0 mt-1.5" />}
                </div>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                  className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-greek-600"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
