"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_ICON: Record<string, string> = {
  event_reminder: "📅",
  payment_reminder: "💳",
  pnm_follow_up: "💬",
  form_missing: "📋",
  task_due: "✅",
  reimbursement_status: "💵",
  photo_approval: "📸",
  interchapter_proposal: "🤝",
  travel_alert: "✈️",
  waiver_missing: "📄",
  officer_handoff: "🔑",
  new_match: "💚",
  match_message: "💬",
  general: "🔔",
};

const TYPE_COLOR: Record<string, string> = {
  payment_reminder: "red",
  form_missing: "yellow",
  task_due: "yellow",
  waiver_missing: "red",
  new_match: "green",
  general: "blue",
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState("unread");

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load(user.id);

      // Real-time subscription
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
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    if (!userId) return;
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
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
            <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: "unread", label: "Unread", count: unread.length },
          { id: "all", label: "All", count: notifications.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-surface-2 rounded-xl animate-pulse" />)}
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
              <span className="text-xl flex-shrink-0 mt-0.5">
                {TYPE_ICON[n.type] ?? TYPE_ICON.general}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.read_at ? "text-foreground" : "font-semibold text-foreground"}`}>
                    {n.title}
                  </p>
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

      {/* Notification preferences */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Notification preferences</p>
        </div>
        <div className="space-y-2">
          {[
            { label: "Event reminders", type: "event_reminder" },
            { label: "Payment reminders", type: "payment_reminder" },
            { label: "Task due soon", type: "task_due" },
            { label: "Form missing", type: "form_missing" },
            { label: "Reimbursement updates", type: "reimbursement_status" },
            { label: "GreekMatch activity", type: "new_match" },
          ].map((pref) => (
            <div key={pref.type} className="flex items-center justify-between py-1.5">
              <label className="text-sm text-foreground">{pref.label}</label>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
