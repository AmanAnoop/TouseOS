import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedPageClient } from "@/components/feed/feed-page-client";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { isDashboardOfficer } from "@/lib/dashboard-roles";
import { loadFeedTimeline } from "@/lib/feed-timeline";

export const metadata = { title: "Chapter Feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const { orgId, orgName, role } = membership;
  const isOfficer = isDashboardOfficer(role);

  const { timeline } = await loadFeedTimeline(supabase, orgId);

  return (
    <FeedPageClient orgId={orgId} orgName={orgName} isOfficer={isOfficer} timeline={timeline} />
  );
}
