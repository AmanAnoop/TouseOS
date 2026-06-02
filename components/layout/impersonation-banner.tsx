"use client";

import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";

export function ImpersonationBanner({
  orgName,
}: {
  orgName: string;
}) {
  const router = useRouter();

  async function stop() {
    const res = await fetch("/api/platform-admin/impersonate", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Could not end session");
      return;
    }
    toast.success("Returned to platform view");
    router.push("/platform-admin");
    router.refresh();
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
        <Eye size={16} />
        Viewing as <strong>{orgName}</strong> (platform support mode)
      </p>
      <Button size="sm" variant="secondary" icon={<X size={14} />} onClick={stop}>
        Exit view-as
      </Button>
    </div>
  );
}
