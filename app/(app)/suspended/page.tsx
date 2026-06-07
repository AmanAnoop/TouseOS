import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { IMPERSONATE_ORG_COOKIE } from "@/lib/platform-impersonate";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { isOrgSuspended } from "@/lib/platform-feature-flags";
import { Card, PageHeader } from "@/components/ui";

export default async function SuspendedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding");

  const cookieStore = await cookies();
  const impersonating = Boolean(cookieStore.get(IMPERSONATE_ORG_COOKIE)?.value)
    && isPlatformAdminEmail(user.email);

  if (impersonating || isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("name, settings")
    .eq("id", membership.orgId)
    .single();

  if (!org || !isOrgSuspended(org.settings)) {
    redirect("/dashboard");
  }

  const reason = (org.settings as Record<string, unknown>)?.platform_suspend_reason;

  return (
    <div className="max-w-lg mx-auto ds-page-stack">
      <PageHeader
        title="Organization suspended"
        description={`${org.name} is temporarily unavailable on TouseOS.`}
      />
      <Card>
        <p className="text-sm text-muted-foreground">
          Your platform administrator has suspended access for this chapter. Members cannot use
          officer tools until the suspension is lifted.
        </p>
        {typeof reason === "string" && reason.trim() && (
          <p className="text-sm mt-3 p-3 rounded-lg bg-surface-1 border border-border">
            <span className="font-medium text-foreground">Reason: </span>
            {reason}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Contact your platform administrator or TouseOS support if you believe this is a mistake.
        </p>
      </Card>
    </div>
  );
}
