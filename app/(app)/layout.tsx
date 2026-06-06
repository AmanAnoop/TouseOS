import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import {
  IMPERSONATE_ORG_COOKIE,
  isPlatformImpersonationEnabled,
} from "@/lib/platform-impersonate";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org-cookie";
import type { Organization, Profile } from "@/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  // Load profile and organizations in parallel
  const [profileRes, orgsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("organizations")
      .select("*")
      .in(
        "id",
        (
          await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .neq("status", "removed")
        ).data?.map((m) => m.org_id) ?? [],
      ),
  ]);

  const profile = profileRes.data as Profile | null;
  let orgs = (orgsRes.data ?? []) as Organization[];

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (activeOrgId && orgs.length > 1) {
    const idx = orgs.findIndex((o) => o.id === activeOrgId);
    if (idx > 0) {
      const [active] = orgs.splice(idx, 1);
      orgs = [active, ...orgs];
    }
  }

  const impersonateOrgId = cookieStore.get(IMPERSONATE_ORG_COOKIE)?.value;
  const impersonating =
    Boolean(impersonateOrgId)
    && isPlatformImpersonationEnabled()
    && isPlatformAdminEmail(user.email);

  if (impersonating && impersonateOrgId) {
    const idx = orgs.findIndex((o) => o.id === impersonateOrgId);
    if (idx > 0) {
      const [target] = orgs.splice(idx, 1);
      orgs = [target, ...orgs];
    } else if (idx === -1) {
      const { data: impOrg } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", impersonateOrgId)
        .single();
      if (impOrg) orgs = [impOrg as Organization, ...orgs];
    }
  }

  const org = orgs[0] ?? null;

  // First-time onboarding
  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      org={org}
      orgs={orgs}
      profile={profile}
      impersonating={impersonating}
      impersonateOrgName={impersonating ? org?.name : undefined}
    >
      {children}
    </AppShell>
  );
}
