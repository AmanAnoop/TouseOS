import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NmeLearningClient } from "@/components/nme/nme-learning-client";
import { NmeSeedButton } from "@/components/nme/nme-seed-button";

export const metadata = { title: "New Member Education" };
export const dynamic = "force-dynamic";

export default async function NmePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const { count } = await supabase.from("nme_modules").select("id", { count: "exact", head: true }).eq("org_id", m.org_id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NmeSeedButton orgId={m.org_id} moduleCount={count ?? 0} />
      </div>
      <NmeLearningClient orgId={m.org_id} />
    </div>
  );
}
