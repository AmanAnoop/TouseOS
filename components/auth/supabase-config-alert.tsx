"use client";

import { useEffect, useState } from "react";

type ConfigResponse = {
  ok: boolean;
  server: { ok: boolean; issues: string[] };
  browser: { ok: boolean; issues: string[] };
  envPresent?: Record<string, boolean>;
  requiredInVercel?: { name: string; example: string }[];
  neverPutInNextPublic?: string[];
  authViaApi: boolean;
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

  const issues = [...new Set([...config.server.issues, ...config.browser.issues])];

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="font-medium">Supabase is not configured correctly on this deployment</p>

      {config.requiredInVercel && (
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p className="font-medium text-foreground">Add these in Vercel → Settings → Environment Variables:</p>
          <ul className="list-none space-y-1.5 text-xs font-mono">
            {config.requiredInVercel.map((v) => (
              <li key={v.name} className="rounded bg-background/80 px-2 py-1">
                <span className={config.envPresent?.[v.name] ? "text-green-600" : "text-red-500"}>
                  {config.envPresent?.[v.name] ? "✓" : "✗"}
                </span>{" "}
                {v.name}
                <br />
                <span className="text-muted-foreground font-sans text-[11px]">{v.example}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {config.neverPutInNextPublic && (
        <p className="mt-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Never</strong> put{" "}
          {config.neverPutInNextPublic.join(", ")} in a{" "}
          <code className="text-xs">NEXT_PUBLIC_*</code> variable.
        </p>
      )}

      {config.envPresent && (
        <p className="mt-2 text-xs text-muted-foreground">
          Detected on server:{" "}
          {Object.entries(config.envPresent)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ") || "none — variables not loaded; redeploy after adding them"}
        </p>
      )}

      {issues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{config.redeployHint}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Then open <code className="text-xs">/api/auth/supabase-config</code> — should show{" "}
        <code className="text-xs">&quot;ok&quot;: true</code>.
      </p>
    </div>
  );
}
