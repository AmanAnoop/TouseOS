import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { PageHeader } from "@/components/ui";
import { SocialAssetsClient } from "@/components/social/social-assets-client";

export const metadata = { title: "Social Asset Library" };
export const dynamic = "force-dynamic";

export default async function SocialAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/onboarding");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name, primary_color, secondary_color, logo_url")
    .eq("id", membership.orgId)
    .single();

  return (
    <div className="ds-page-stack">
      <PageHeader
        title="Social Asset Library"
        description="Brand assets, saved captions, and templates — use copies to your social calendar"
      />
      <SocialAssetsClient
        orgId={membership.orgId}
        org={{
          name: String(orgRow?.name ?? membership.orgName ?? "Chapter"),
          primary_color: orgRow?.primary_color as string | null,
          secondary_color: orgRow?.secondary_color as string | null,
          logo_url: orgRow?.logo_url as string | null,
        }}
      />
    </div>
  );
}
