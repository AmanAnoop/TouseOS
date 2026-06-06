"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui";
import { PlatformKeysPanel } from "@/components/platform-admin/platform-keys-panel";

export default function PlatformAdminKeysPage() {
  const router = useRouter();
  const supabase = createClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/platform-admin/check");
      const data = await res.json();
      if (!data.allowed) {
        router.push("/dashboard");
        return;
      }
      setAllowed(true);
    }
    check();
  }, [supabase, router]);

  if (allowed !== true) {
    return <div className="h-64 rounded-xl bg-surface-2 animate-pulse" />;
  }

  return (
    <div className="space-y-5">
      <Link href="/platform-admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Platform admin
      </Link>
      <PageHeader
        title="Integration keys"
        description="Enter Stripe, Twilio, Anthropic, Mapbox, and other deployment credentials"
      />
      <PlatformKeysPanel />
    </div>
  );
}
