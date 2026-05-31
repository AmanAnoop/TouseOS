"use client";

import { useState, useEffect } from "react";
import {
  Building, Check, Copy, LogOut, Plus, Save,
  Settings, Shield, Trash2, UserCheck, UserMinus, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Alert, Avatar, Badge, Button, Card, CardHeader,
  Input, Modal, PageHeader, Select, Tabs,
} from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";
import { orgTypeLabel } from "@/lib/utils";
import type { OrgMember } from "@/types";

interface OrgMemberWithProfile extends OrgMember {
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  member_profiles?: { id: string; full_name: string; email: string } | null;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([]);
  const [myRole, setMyRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("general_member");

  const [orgForm, setOrgForm] = useState({
    name: "", campus: "", councilOrLeague: "", contactEmail: "",
    privacy: "private", primaryColor: "#059669", secondaryColor: "#065f46",
  });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, role, organizations(*)")
        .eq("user_id", user.id)
        .neq("status", "removed")
        .limit(1)
        .single();
      if (!m) return;
      setOrgId(m.org_id);
      setMyRole(String(m.role));
      const orgData = m.organizations as Record<string, unknown>;
      setOrg(orgData);
      setOrgForm({
        name: String(orgData.name ?? ""),
        campus: String(orgData.campus ?? ""),
        councilOrLeague: String(orgData.council_or_league ?? ""),
        contactEmail: String(orgData.contact_email ?? ""),
        privacy: String(orgData.privacy ?? "private"),
        primaryColor: String(orgData.primary_color ?? "#059669"),
        secondaryColor: String(orgData.secondary_color ?? "#065f46"),
      });

      // Load members with profile info
      const { data: membersData } = await supabase
        .from("org_members")
        .select("*, profiles(full_name, avatar_url), member_profiles(id, full_name, email)")
        .eq("org_id", m.org_id)
        .order("joined_at");
      setMembers((membersData ?? []) as OrgMemberWithProfile[]);
    }
    init();
  }, [supabase]);

  const isAdmin = ["owner", "president", "advisor"].includes(myRole);

  async function saveOrgProfile() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      name: orgForm.name,
      campus: orgForm.campus || null,
      council_or_league: orgForm.councilOrLeague || null,
      contact_email: orgForm.contactEmail || null,
      privacy: orgForm.privacy,
      primary_color: orgForm.primaryColor,
      secondary_color: orgForm.secondaryColor,
    }).eq("id", orgId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
    setOrg({ ...org, ...orgForm });
  }

  async function copyInviteCode() {
    if (!org?.invite_code) return;
    await navigator.clipboard.writeText(String(org.invite_code));
    toast.success("Invite code copied!");
  }

  async function regenerateInviteCode() {
    if (!orgId || !isAdmin) return;
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase.from("organizations").update({ invite_code: newCode }).eq("id", orgId);
    setOrg({ ...org, invite_code: newCode });
    toast.success("New invite code generated");
  }

  async function sendInvite() {
    if (!orgId || !inviteEmail) return;
    const res = await fetch("/api/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
    } else {
      toast.error("Failed to send invite");
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    await supabase.from("org_members").update({ role: newRole }).eq("id", memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    toast.success("Role updated");
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    await supabase.from("org_members").update({ status: "removed" }).eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Member removed");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const roleOptions = Object.entries(ROLE_LABELS)
    .filter(([v]) => !["parent", "university_admin"].includes(v))
    .map(([value, label]) => ({ value, label }));

  const activeMembers = members.filter((m) => m.status !== "removed");
  const pendingMembers = members.filter((m) => m.status === "pending_invite");

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Manage organization profile, members, and integrations" />

      <Tabs
        tabs={[
          { id: "profile", label: "Organization" },
          { id: "members", label: "Members", count: activeMembers.length },
          { id: "integrations", label: "Integrations" },
          { id: "danger", label: "Danger zone" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Organization profile ─────────────────────────────── */}
      {tab === "profile" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Organization profile" icon={<Building size={16} />} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Organization name" required value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} disabled={!isAdmin} />
              <Input label="Campus / University" value={orgForm.campus} onChange={(e) => setOrgForm({ ...orgForm, campus: e.target.value })} disabled={!isAdmin} />
              <Input label="Council or League" placeholder="IFC, Panhellenic, Campus Rec" value={orgForm.councilOrLeague} onChange={(e) => setOrgForm({ ...orgForm, councilOrLeague: e.target.value })} disabled={!isAdmin} />
              <Input label="Contact email" type="email" value={orgForm.contactEmail} onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })} disabled={!isAdmin} />
              <Select
                label="Privacy"
                value={orgForm.privacy}
                onChange={(e) => setOrgForm({ ...orgForm, privacy: e.target.value })}
                options={[{ value: "private", label: "Private — members only" }, { value: "public", label: "Public — visible to all" }]}
                disabled={!isAdmin}
              />
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Primary color</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="h-9 w-16 rounded-lg border border-border cursor-pointer" value={orgForm.primaryColor} onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })} disabled={!isAdmin} />
                  <span className="text-sm font-mono text-muted-foreground">{orgForm.primaryColor}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Secondary color</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="h-9 w-16 rounded-lg border border-border cursor-pointer" value={orgForm.secondaryColor} onChange={(e) => setOrgForm({ ...orgForm, secondaryColor: e.target.value })} disabled={!isAdmin} />
                  <span className="text-sm font-mono text-muted-foreground">{orgForm.secondaryColor}</span>
                </div>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={saveOrgProfile} loading={saving} icon={<Save size={14} />} className="mt-4">
                Save changes
              </Button>
            )}
          </Card>

          {/* Invite code */}
          <Card>
            <CardHeader title="Invite code" description="Share with members to join your organization" icon={<Copy size={16} />} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-12 rounded-xl border border-border bg-surface-1 flex items-center justify-center">
                <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
                  {String(org?.invite_code ?? "········")}
                </span>
              </div>
              <Button variant="secondary" icon={<Copy size={14} />} onClick={copyInviteCode}>Copy</Button>
              {isAdmin && (
                <Button variant="secondary" onClick={regenerateInviteCode}>Regenerate</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Members enter this code at <strong>app.touseos.com/onboarding</strong> to request to join.</p>
          </Card>

          {/* Read-only org info */}
          <Card>
            <CardHeader title="Organization info" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Type", value: orgTypeLabel(String(org?.type ?? "")) },
                { label: "Created", value: org?.created_at ? new Date(String(org.created_at)).toLocaleDateString() : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-surface-1 rounded-lg">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Members ─────────────────────────────────────────── */}
      {tab === "members" && (
        <div className="space-y-4">
          {pendingMembers.length > 0 && (
            <Card>
              <CardHeader title="Pending invites" description={`${pendingMembers.length} waiting for approval`} />
              <div className="space-y-2">
                {pendingMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar name={String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "?")} src={m.profiles?.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{String(m.profiles?.full_name ?? m.member_profiles?.email ?? "Pending member")}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role.replace("_", " ")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" icon={<UserCheck size={12} />} onClick={() => {
                        supabase.from("org_members").update({ status: "active" }).eq("id", m.id).then(() => {
                          setMembers((prev) => prev.map((pm) => pm.id === m.id ? { ...pm, status: "active" } : pm));
                          toast.success("Member approved");
                        });
                      }}>Approve</Button>
                      <Button size="sm" variant="danger" icon={<UserMinus size={12} />} onClick={() => removeMember(m.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activeMembers.length} active members</p>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setInviteOpen(true)}>Invite member</Button>
          </div>

          <Card padding="none">
            <div className="divide-y divide-border">
              {activeMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4 hover:bg-surface-1 transition-colors">
                  <Avatar
                    name={String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "?")}
                    src={m.profiles?.avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {String(m.profiles?.full_name ?? m.member_profiles?.full_name ?? "—")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(m.member_profiles?.email ?? "—")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin ? (
                      <select
                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none"
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                      >
                        {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <Badge label={ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role} color="gray" />
                    )}
                    <Badge label={m.status} color={m.status === "active" ? "green" : "yellow"} dot />
                    {isAdmin && m.role !== "owner" && (
                      <button onClick={() => removeMember(m.id)} className="p-1 rounded text-muted-foreground hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Integrations ─────────────────────────────────────── */}
      {tab === "integrations" && (
        <div className="space-y-4">
          <Alert type="info" title="Configure integrations to unlock payment processing, SMS, and AI features." />
          {[
            {
              name: "Supabase",
              description: "Database, authentication, storage, and real-time features",
              status: "connected",
              config: "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY",
              docsUrl: "https://supabase.com/docs",
            },
            {
              name: "Stripe",
              description: "Dues payment processing, checkout links, and webhooks",
              status: org?.stripe_account_id ? "connected" : "not_configured",
              config: "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET",
              docsUrl: "https://stripe.com/docs",
            },
            {
              name: "Twilio",
              description: "Consent-based PNM SMS texting with STOP/HELP handling",
              status: "check_env",
              config: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_MESSAGING_SERVICE_SID",
              docsUrl: "https://www.twilio.com/docs",
            },
            {
              name: "OpenAI",
              description: "AI assistant for captions, event plans, and newsletters",
              status: "check_env",
              config: "OPENAI_API_KEY",
              docsUrl: "https://platform.openai.com/docs",
            },
            {
              name: "Email provider (Resend/SendGrid)",
              description: "Email blasts, invite emails, and payment receipts",
              status: "not_configured",
              config: "RESEND_API_KEY or SENDGRID_API_KEY",
              docsUrl: "https://resend.com/docs",
            },
          ].map((integration) => (
            <Card key={integration.name} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{integration.name}</p>
                    <Badge
                      label={integration.status.replace("_", " ")}
                      color={integration.status === "connected" ? "green" : integration.status === "check_env" ? "yellow" : "gray"}
                      dot
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1 bg-surface-2 px-2 py-0.5 rounded">{integration.config}</p>
                </div>
                <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-greek-600 hover:underline flex-shrink-0">Docs</a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Danger zone ──────────────────────────────────────── */}
      {tab === "danger" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Sign out" icon={<LogOut size={16} />} />
            <p className="text-sm text-muted-foreground mb-3">Sign out of your TouseOS account on this device.</p>
            <Button variant="secondary" icon={<LogOut size={14} />} onClick={signOut}>Sign out</Button>
          </Card>

          {isAdmin && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader title="Danger zone" description="Irreversible actions. Proceed carefully." icon={<Shield size={16} className="text-red-500" />} />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900">
                  <div>
                    <p className="text-sm font-medium text-foreground">Archive organization</p>
                    <p className="text-xs text-muted-foreground">Hides the org from member view. Data is preserved.</p>
                  </div>
                  <Button variant="secondary" size="sm">Archive</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} disabled={!inviteEmail}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Email address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@university.edu" />
          <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={roleOptions} />
        </div>
      </Modal>
    </div>
  );
}
