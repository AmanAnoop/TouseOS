import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { NmeLearningClient } from "@/components/nme/nme-learning-client";
import { NmeSeedButton } from "@/components/nme/nme-seed-button";

export const metadata = { title: "New Member Education" };
export const dynamic = "force-dynamic";

export default async function NmePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) redirect("/onboarding");

  const { count } = await supabase.from("nme_modules").select("id", { count: "exact", head: true }).eq("org_id", membership.orgId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NmeSeedButton orgId={membership.orgId} moduleCount={count ?? 0} />
      </div>
      <NmeLearningClient orgId={membership.orgId} />
    </div>
  );
}
