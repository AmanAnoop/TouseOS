"use client";

import { useState, useEffect } from "react";
import { LogOut, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Alert, Badge, Button, Card, CardHeader,
  PageHeader, Tabs,
} from "@/components/ui";
import { OrgProfileForm, type OrgProfileFormData } from "@/components/settings/org-profile-form";
import { InviteCodeCard } from "@/components/settings/invite-code-card";
import { MemberRolesPanel, type OrgMemberWithProfile } from "@/components/settings/member-roles-panel";
import { StripeConnectPanel } from "@/components/settings/stripe-connect-panel";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([]);
  const [myRole, setMyRole] = useState("");
  const [saving, setSaving] = useState(false);

  const [orgForm, setOrgForm] = useState<OrgProfileFormData>({
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
      const orgData = m.organizations as unknown as Record<string, unknown>;
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
  const activeMembers = members.filter((m) => m.status !== "removed");

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

  async function sendInvite(email: string, role: string) {
    if (!orgId) return;
    const res = await fetch("/api/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, email, role }),
    });
    if (res.ok) {
      toast.success(`Invite sent to ${email}`);
    } else {
      toast.error("Failed to send invite");
    }
  }

  async function approveMember(memberId: string) {
    await supabase.from("org_members").update({ status: "active" }).eq("id", memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: "active" } : m));
    toast.success("Member approved");
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

      {tab === "profile" && (
        <div className="space-y-4">
          <OrgProfileForm
            form={orgForm}
            org={org}
            isAdmin={isAdmin}
            saving={saving}
            onChange={(updates) => setOrgForm({ ...orgForm, ...updates })}
            onSave={saveOrgProfile}
          />
          <InviteCodeCard
            inviteCode={org?.invite_code ? String(org.invite_code) : null}
            isAdmin={isAdmin}
            onCopy={copyInviteCode}
            onRegenerate={regenerateInviteCode}
          />
        </div>
      )}

      {tab === "members" && (
        <MemberRolesPanel
          members={members}
          isAdmin={isAdmin}
          onApprove={approveMember}
          onChangeRole={changeRole}
          onRemove={removeMember}
          onInvite={sendInvite}
        />
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <Alert type="info" title="Configure integrations to unlock payment processing, SMS, and AI features." />
          {isAdmin && orgId && (
            <StripeConnectPanel
              orgId={orgId}
              initialAccountId={org?.stripe_account_id ? String(org.stripe_account_id) : null}
            />
          )}
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!orgId || !confirm("Archive this organization? Members will lose access until restored.")) return;
                      const settings = { ...(org?.settings as object ?? {}), archived: true, archived_at: new Date().toISOString() };
                      const { error } = await supabase.from("organizations").update({ settings }).eq("id", orgId);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Organization archived");
                        router.push("/onboarding");
                      }
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
