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
import { useOrg } from "@/hooks/use-org";
import { InviteCodeCard } from "@/components/settings/invite-code-card";
import { MemberRolesPanel, type OrgMemberWithProfile } from "@/components/settings/member-roles-panel";
import { StripeConnectPanel } from "@/components/settings/stripe-connect-panel";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { orgId, role: myRole } = useOrg();
  const [tab, setTab] = useState("profile");
  const [org, setOrg] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([]);
  const [saving, setSaving] = useState(false);

  const [orgForm, setOrgForm] = useState<OrgProfileFormData>({
    name: "", campus: "", councilOrLeague: "", contactEmail: "",
    privacy: "private", primaryColor: "#004225", secondaryColor: "#0B1F3A",
    universityId: "", greekAffiliationId: "",
  });

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await fetch(`/api/org/settings?org_id=${encodeURIComponent(orgId)}`);
      if (!res.ok) return;
      const { org: orgData, members: membersData } = await res.json();
      if (!orgData) return;
      setOrg(orgData as Record<string, unknown>);
      const settings = ((orgData.settings ?? {}) as Record<string, unknown>);
      setOrgForm({
        name: String(orgData.name ?? ""),
        campus: String(orgData.campus ?? ""),
        councilOrLeague: String(orgData.council_or_league ?? ""),
        contactEmail: String(orgData.contact_email ?? ""),
        privacy: String(orgData.privacy ?? "private"),
        primaryColor: String(orgData.primary_color ?? "#004225"),
        secondaryColor: String(orgData.secondary_color ?? "#0B1F3A"),
        universityId: String(settings.university_id ?? ""),
        greekAffiliationId: String(settings.greek_affiliation_id ?? ""),
      });
      setMembers((membersData ?? []) as OrgMemberWithProfile[]);
    })();
  }, [orgId]);

  const isAdmin = ["owner", "president", "advisor"].includes(String(myRole));
  const activeMembers = members.filter((m) => m.status !== "removed");

  async function saveOrgProfile() {
    if (!orgId) return;
    setSaving(true);
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        name: orgForm.name,
        campus: orgForm.campus,
        councilOrLeague: orgForm.councilOrLeague,
        contactEmail: orgForm.contactEmail,
        privacy: orgForm.privacy,
        primaryColor: orgForm.primaryColor,
        secondaryColor: orgForm.secondaryColor,
        universityId: orgForm.universityId,
        greekAffiliationId: orgForm.greekAffiliationId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to save");
      return;
    }
    const { org: updated } = await res.json();
    toast.success("Settings saved");
    setOrg(updated as Record<string, unknown>);
  }

  async function copyInviteCode() {
    if (!org?.invite_code) return;
    await navigator.clipboard.writeText(String(org.invite_code));
    toast.success("Invite code copied!");
  }

  async function regenerateInviteCode() {
    if (!orgId || !isAdmin) return;
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, regenerateInviteCode: true }),
    });
    if (!res.ok) {
      toast.error("Failed to regenerate code");
      return;
    }
    const { org: updated } = await res.json();
    setOrg(updated as Record<string, unknown>);
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

  async function patchMembership(memberId: string, patch: { role?: string; status?: string }) {
    if (!orgId) return false;
    const res = await fetch("/api/org/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, memberId, ...patch }),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return false;
    }
    const updated = await res.json();
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, ...updated } : m)));
    return true;
  }

  async function approveMember(memberId: string) {
    if (await patchMembership(memberId, { status: "active" })) toast.success("Member approved");
  }

  async function changeRole(memberId: string, newRole: string) {
    if (await patchMembership(memberId, { role: newRole })) toast.success("Role updated");
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    if (await patchMembership(memberId, { status: "removed" })) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    }
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
          {isAdmin && Boolean(org?.platform_plan) && (
            <Card padding="sm">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">TouseOS plan</p>
              <p className="text-sm font-medium capitalize">
                {String(org?.platform_plan)} · {String(org?.platform_plan_status ?? "active")}
              </p>
            </Card>
          )}
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
                      const res = await fetch("/api/org/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          orgId,
                          settingsPatch: {
                            archived: true,
                            archived_at: new Date().toISOString(),
                          },
                        }),
                      });
                      if (!res.ok) toast.error("Failed to archive");
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
