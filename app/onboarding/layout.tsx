import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const { count } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "removed");

  if ((count ?? 0) > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
