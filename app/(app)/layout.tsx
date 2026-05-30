import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Organization, Profile } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
  const orgs = (orgsRes.data ?? []) as Organization[];
  const org = orgs[0] ?? null;

  // First-time onboarding
  if (orgs.length === 0) {
    redirect("/onboarding");
  }

  return (
    <AppShell org={org} orgs={orgs} profile={profile}>
      {children}
    </AppShell>
  );
}
