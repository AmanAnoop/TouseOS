"use client";

import { useEffect, useState } from "react";

type ConfigResponse = {
  ok: boolean;
  server: { ok: boolean; issues: string[] };
  browser: { ok: boolean; issues: string[] };
  authViaApi: boolean;
  vercelSteps: string[];
  redeployHint: string;
};

export function SupabaseConfigAlert() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);

  useEffect(() => {
    fetch("/api/auth/supabase-config")
      .then((r) => r.json())
      .then((data: ConfigResponse) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  if (!config) return null;

  if (config.ok && config.browser.ok) return null;

  if (config.authViaApi && !config.browser.ok) {
    return (
      <div
        role="status"
        className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
      >
        <p className="font-medium text-foreground">Sign-up works via server, but browser env is missing</p>
        <p className="mt-1 text-muted-foreground">
          Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel (same values as your
          Supabase project), then <strong>redeploy</strong> for full client support.
        </p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="font-medium">Supabase environment variables are missing on Vercel</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        {config.vercelSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {config.server.issues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {[...new Set([...config.server.issues, ...config.browser.issues])].map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{config.redeployHint}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        After redeploy, confirm:{" "}
        <code className="text-xs">/api/auth/supabase-config</code> shows{" "}
        <code className="text-xs">&quot;ok&quot;: true</code>.
      </p>
    </div>
  );
}
