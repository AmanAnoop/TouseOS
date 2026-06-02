"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";

interface PromptBatch {
  id: string;
  event_id: string;
  prompts: Array<{ key: string; label: string; description?: string }>;
  created_at: string;
}

export function ActivePhotoPrompts({ orgId }: { orgId: string }) {
  const [batch, setBatch] = useState<PromptBatch | null>(null);

  useEffect(() => {
    fetch(`/api/events/photo-prompts?org_id=${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) setBatch(data[0]);
      });
  }, [orgId]);

  if (!batch?.prompts?.length) return null;

  return (
    <Card padding="sm" className="border-greek-200 bg-greek-50/50 dark:bg-greek-950/20">
      <p className="text-sm font-semibold flex items-center gap-2 mb-2">
        <Camera size={14} />
        Active photo prompts from your officers
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 mb-2">
        {batch.prompts.slice(0, 4).map((p) => (
          <li key={p.key}>• {p.label}</li>
        ))}
      </ul>
      <Link href="/social" className="text-xs text-greek-600 hover:underline font-medium">
        Upload to an event album →
      </Link>
    </Card>
  );
}
