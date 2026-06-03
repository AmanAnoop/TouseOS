"use client";

import { useEffect, useState } from "react";
import { validateSupabasePublicConfig } from "@/lib/supabase/public-config";

type ServerCheck = {
  ok: boolean;
  keyKind: string;
  projectRef: string | null;
  issues: string[];
  redeployHint?: string;
};

export function SupabaseConfigAlert() {
  const [serverCheck, setServerCheck] = useState<ServerCheck | null>(null);
  const clientValidation = validateSupabasePublicConfig();

  useEffect(() => {
    fetch("/api/auth/supabase-config")
      .then((r) => r.json())
      .then((data: ServerCheck) => setServerCheck(data))
      .catch(() => setServerCheck(null));
  }, []);

  const issues = [
    ...clientValidation.issues,
    ...(serverCheck && !serverCheck.ok ? serverCheck.issues : []),
  ];
  const uniqueIssues = [...new Set(issues)];

  const showAlert =
    !clientValidation.ok ||
    (serverCheck !== null && !serverCheck.ok) ||
    clientValidation.keyKind === "service_role_jwt";

  if (!showAlert && uniqueIssues.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-foreground"
    >
      <p className="font-medium">Supabase is misconfigured — sign-up will fail with &quot;Invalid API key&quot;</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {uniqueIssues.length > 0 ? (
          uniqueIssues.map((issue) => <li key={issue}>{issue}</li>)
        ) : (
          <li>
            Check Vercel env vars: <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (anon/public key only).
          </li>
        )}
      </ul>
      {clientValidation.keyKind === "service_role_jwt" && (
        <p className="mt-2 font-medium text-foreground">
          You likely pasted the <strong>service_role</strong> key into{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Use the{" "}
          <strong>anon</strong> or <strong>publishable</strong> key instead.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {serverCheck?.redeployHint ??
          "On Vercel, redeploy after updating environment variables so NEXT_PUBLIC_* values are rebuilt."}
      </p>
    </div>
  );
}
