"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export function NmeProgressBanner({ orgId }: { orgId: string }) {
  const [incomplete, setIncomplete] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const res = await fetch(`/api/nme/modules?org_id=${encodeURIComponent(orgId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const modules = (data.modules ?? []) as Array<{ id: string; is_required: boolean }>;
      const completed = new Set((data.completedModuleIds ?? []) as string[]);
      const required = modules.filter((m) => m.is_required);
      const done = required.filter((m) => completed.has(m.id)).length;
      if (required.length > 0 && done < required.length) {
        setIncomplete(true);
        setProgress(`${done}/${required.length}`);
      }
    })();
  }, [orgId]);

  if (!incomplete) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm">
        <BookOpen size={16} className="text-amber-700" />
        <span>
          New member education: <strong>{progress}</strong> required modules complete
        </span>
      </div>
      <Link href="/nme" className="text-sm font-medium text-greek-600 hover:underline">
        Continue modules →
      </Link>
    </div>
  );
}
