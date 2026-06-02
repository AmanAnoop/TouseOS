import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SocialAssetsClient } from "@/components/social/social-assets-client";

export const metadata = { title: "Social Asset Library" };
export const dynamic = "force-dynamic";

export default async function SocialAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, organizations(name, primary_color, secondary_color, logo_url)")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!m) redirect("/onboarding");

  const org = m.organizations as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Asset Library"
        description="Brand assets, saved captions, and templates — use copies to your social calendar"
      />
      <SocialAssetsClient
        orgId={m.org_id}
        org={{
          name: String(org.name ?? "Chapter"),
          primary_color: org.primary_color as string | null,
          secondary_color: org.secondary_color as string | null,
          logo_url: org.logo_url as string | null,
        }}
      />
    </div>
  );
}
