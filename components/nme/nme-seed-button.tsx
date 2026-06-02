"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { usePermissions } from "@/hooks/use-permissions";

interface NmeSeedButtonProps {
  orgId: string;
  moduleCount: number;
}

export function NmeSeedButton({ orgId, moduleCount }: NmeSeedButtonProps) {
  const { can, loading } = usePermissions();
  const [seeding, setSeeding] = useState(false);

  if (loading || (!can("manage_nme") && !can("manage_org_settings"))) {
    return null;
  }

  async function seedModules() {
    setSeeding(true);
    try {
      const res = await fetch("/api/nme/seed-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not seed modules");
        return;
      }
      if (data.seeded > 0) {
        toast.success(`Added ${data.seeded} education modules`);
        window.location.reload();
      } else {
        toast.success(data.message ?? "Modules already configured");
      }
    } catch {
      toast.error("Could not seed modules");
    } finally {
      setSeeding(false);
    }
  }

  if (moduleCount > 0) return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      icon={<BookOpen size={14} />}
      loading={seeding}
      onClick={seedModules}
    >
      Seed default modules
    </Button>
  );
}
