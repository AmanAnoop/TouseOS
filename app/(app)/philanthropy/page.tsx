import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Construction } from "lucide-react";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-5">
      <PageHeader title="Coming soon" />
      <Card>
        <EmptyState icon={<Construction size={24} />} title="Under construction" description="This module is in active development." />
      </Card>
    </div>
  );
}
