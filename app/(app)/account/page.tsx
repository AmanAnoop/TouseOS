"use client";

import { useState, useEffect } from "react";
import {
  KeyRound, Mail, Save, Shield, User, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { InterestsEditor } from "@/components/members/interests-editor";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";
import {
  Alert, Avatar, Button, Card, CardHeader,
  Input, PageHeader, Tabs,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";
import { PushSettingsPanel } from "@/components/notifications/push-settings-panel";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function AccountPage() {
  const supabase = createClient();
  const { orgId } = useOrg();
  const [tab, setTab] = useState("profile");
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    preferredName: "",
    phone: "",
    avatarUrl: "",
  });

  const [emailForm, setEmailForm] = useState({ email: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [channels, setChannels] = useState({ email: true, sms: true, push: false });
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const push = usePushNotifications();

  const [orgMemberships, setOrgMemberships] = useState<Array<{
    id: string; role: string; status: string; joined_at: string;
    org: { name: string; type: string; campus: string | null };
  }>>([]);

  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [memberProfileId, setMemberProfileId] = useState<string | null>(null);
  const [memberInterests, setMemberInterests] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setCurrentUserEmail(user.email ?? "");
      setEmailForm({ email: user.email ?? "" });

      const q = orgId ? `?org_id=${encodeURIComponent(orgId)}` : "";
      const res = await fetch(`/api/account${q}`);
      if (!res.ok) return;
      const data = await res.json();

      setProfile({
        fullName: String(data.profile?.fullName ?? ""),
        preferredName: String(data.profile?.preferredName ?? ""),
        phone: String(data.profile?.phone ?? ""),
        avatarUrl: String(data.profile?.avatarUrl ?? ""),
      });

      setOrgMemberships((data.memberships ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        role: String(m.role),
        status: String(m.status),
        joined_at: String(m.joined_at),
        org: m.org as { name: string; type: string; campus: string | null },
      })));

      if (data.memberProfile) {
        setMemberProfileId(String(data.memberProfile.id));
        setMemberInterests((data.memberProfile.interests as string[]) ?? []);
      }

      setChannels({
        email: Boolean(data.profile?.notificationEmail ?? true),
        sms: Boolean(data.profile?.notificationSms ?? true),
        push: Boolean(data.profile?.notificationPush ?? false),
      });
      setPreferences(data.profile?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES);
    }
    init();
  }, [supabase, orgId]);

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        preferredName: profile.preferredName,
        phone: profile.phone,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    toast.success("Profile updated");
  }

  async function changeEmail() {
    if (!emailForm.email || emailForm.email === currentUserEmail) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: emailForm.email });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check your new email address to confirm the change.");
    setCurrentUserEmail(emailForm.email);
  }

  async function changePassword() {
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirm) {
      toast.error("Passwords must match");
      return;
    }
    if (passwordForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully");
    setPasswordForm({ password: "", confirm: "" });
  }

  async function saveNotifications() {
    if (!userId) return;
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationEmail: channels.email,
        notificationSms: channels.sms,
        notificationPush: channels.push,
        notificationPreferences: preferences,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save preferences");
      return;
    }
    toast.success("Notification preferences saved");
  }

  async function handlePushChannelChange(enabled: boolean) {
    if (enabled) {
      const ok = await push.enablePush();
      if (ok) setChannels((c) => ({ ...c, push: true }));
    } else {
      const ok = await push.disablePush();
      if (ok) setChannels((c) => ({ ...c, push: false }));
    }
  }

  async function leaveOrg(membershipId: string) {
    if (!confirm("Leave this organization? You can rejoin with an invite code.")) return;
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveMembershipId: membershipId }),
    });
    if (!res.ok) {
      toast.error("Failed to leave org");
      return;
    }
    setOrgMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    toast.success("Left organization");
  }


  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <PageHeader title="Account" description="Manage your profile, security, and notifications" />

      {/* Avatar header */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={profile.fullName || "You"} src={profile.avatarUrl || null} size="xl" />
          <div>
            <p className="font-bold text-lg text-foreground">{profile.fullName || "Your name"}</p>
            <p className="text-sm text-muted-foreground">{currentUserEmail}</p>
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "security", label: "Security" },
          { id: "notifications", label: "Notifications" },
          { id: "orgs", label: "Organizations", count: orgMemberships.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "profile" && (
        <Card>
          <CardHeader title="Personal info" icon={<User size={16} />} />
          <div className="space-y-4">
            <Input label="Full name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            <Input label="Preferred name" placeholder="Nickname" value={profile.preferredName} onChange={(e) => setProfile({ ...profile, preferredName: e.target.value })} />
            {memberProfileId && (
              <InterestsEditor memberId={memberProfileId} initialInterests={memberInterests} />
            )}
            <Input label="Phone number" type="tel" placeholder="+1 (555) 000-0000" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button onClick={saveProfile} loading={saving} icon={<Save size={14} />} className="mt-4">Save changes</Button>
        </Card>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Email address" icon={<Mail size={16} />} />
            <Input label="Email" type="email" value={emailForm.email} onChange={(e) => setEmailForm({ email: e.target.value })} />
            {emailForm.email !== currentUserEmail && (
              <Alert type="info" title="A confirmation link will be sent to your new email address." className="mt-3" />
            )}
            <Button onClick={changeEmail} loading={saving} disabled={!emailForm.email || emailForm.email === currentUserEmail} className="mt-3">
              Update email
            </Button>
          </Card>

          <Card>
            <CardHeader title="Password" icon={<KeyRound size={16} />} />
            <div className="space-y-3">
              <Input label="New password" type="password" placeholder="8+ characters" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} />
              <Input label="Confirm password" type="password" placeholder="Repeat password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
            </div>
            <Button onClick={changePassword} loading={saving} disabled={!passwordForm.password} className="mt-3">Change password</Button>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader title="Security" icon={<Shield size={16} className="text-red-500" />} />
            <p className="text-sm text-muted-foreground mb-3">Sign out from all devices for extra security.</p>
            <Button variant="secondary" onClick={async () => {
              await supabase.auth.signOut({ scope: "global" });
              window.location.href = "/login";
            }}>Sign out all devices</Button>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-4">
          <PushSettingsPanel compact />
          <NotificationPreferencesForm
            preferences={preferences}
            channels={channels}
            onChannelChange={(key, value) => {
              if (key === "push") {
                handlePushChannelChange(value);
              } else {
                setChannels({ ...channels, [key]: value });
              }
            }}
            onPreferenceChange={(key, value) => setPreferences({ ...preferences, [key]: value })}
            onSave={saveNotifications}
            saving={saving}
          />
        </div>
      )}

      {tab === "orgs" && (
        <div className="space-y-3">
          {orgMemberships.length === 0 ? (
            <Card>
              <p className="text-center text-muted-foreground py-6">Not a member of any organizations yet.</p>
            </Card>
          ) : (
            orgMemberships.map((m) => (
              <Card key={m.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-700 font-bold flex-shrink-0">
                    {m.org.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.org.campus ?? ""} · {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${m.status === "active" ? "bg-green-500" : "bg-yellow-500"}`} />
                    <button
                      onClick={() => leaveOrg(m.id)}
                      className="p-1 text-muted-foreground hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
          <p className="text-xs text-center text-muted-foreground">
            To join another organization, go to{" "}
            <a href="/onboarding" className="text-greek-600 hover:underline">Onboarding</a> and enter an invite code.
          </p>
        </div>
      )}
    </div>
  );
}
