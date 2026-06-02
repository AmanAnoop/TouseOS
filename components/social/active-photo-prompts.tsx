"use client";

import { useEffect, useState } from "react";
import { Camera, Upload } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";

interface PromptBatch {
  id: string;
  event_id: string;
  album_id: string | null;
  event_title: string | null;
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

  const uploadHref = batch.album_id
    ? `/social?eventId=${batch.event_id}&albumId=${batch.album_id}&upload=1`
    : `/social?eventId=${batch.event_id}&upload=1`;

  return (
    <Card padding="sm" className="border-greek-200 bg-greek-50/50 dark:bg-greek-950/20">
      <p className="text-sm font-semibold flex items-center gap-2 mb-1">
        <Camera size={14} />
        Photo prompts
        {batch.event_title ? ` — ${batch.event_title}` : ""}
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 mb-3">
        {batch.prompts.map((p) => (
          <li key={p.key}>
            <span className="font-medium text-foreground">{p.label}:</span>{" "}
            {p.description ?? "Share your best shot"}
          </li>
        ))}
      </ul>
      <Link
        href={uploadHref}
        className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-greek-600 text-white text-sm font-medium hover:bg-greek-700 w-full sm:w-auto"
      >
        <Upload size={14} />
        Upload to event album
      </Link>
    </Card>
  );
}
