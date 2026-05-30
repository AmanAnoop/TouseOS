import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { Settings } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, role, organizations(*)").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const org = m.organizations as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Manage organization profile, invites, and preferences" />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Organization profile" icon={<Settings size={16} />} />
          <div className="space-y-4">
            {[
              { label: "Name", value: org.name },
              { label: "Type", value: String(org.type).replace("_", " ") },
              { label: "Campus", value: org.campus ?? "—" },
              { label: "Council/League", value: org.council_or_league ?? "—" },
              { label: "Contact email", value: org.contact_email ?? "—" },
              { label: "Privacy", value: org.privacy },
              { label: "Invite code", value: org.invite_code },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{String(value ?? "—")}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Integrations" />
          <div className="space-y-3">
            {[
              { name: "Stripe", description: "Payment processing", connected: !!org.stripe_account_id, color: "text-indigo-600" },
              { name: "Twilio", description: "SMS messaging", connected: false, color: "text-red-600" },
              { name: "Supabase Storage", description: "Photo & document storage", connected: true, color: "text-green-600" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
                <span className={`text-xs font-medium ${integration.connected ? "text-green-600" : "text-muted-foreground"}`}>
                  {integration.connected ? "Connected" : "Not connected"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
