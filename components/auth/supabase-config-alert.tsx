"use client";

import { isSupabaseConfigured } from "@/lib/supabase/env";

export function SupabaseConfigAlert() {
  if (isSupabaseConfigured()) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="font-medium">Sign-in is not configured on this deployment.</p>
      <p className="mt-1 text-muted-foreground">
        Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your hosting
        environment, then redeploy.
      </p>
    </div>
  );
}
