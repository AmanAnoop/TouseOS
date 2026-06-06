"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, KeyRound, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Alert, Badge, Button, Card, CardHeader, Input, ProgressBar } from "@/components/ui";

interface KeyRow {
  key: string;
  label: string;
  group: string;
  description?: string;
  secret?: boolean;
  configured: boolean;
  source: "environment" | "database" | null;
  masked: string | null;
  locked: boolean;
}

interface DepthGap {
  id: string;
  label: string;
  category: string;
  points: number;
  done: boolean;
  hint?: string;
}

interface KeysPayload {
  grouped: Array<{ id: string; label: string; keys: KeyRow[] }>;
  depth: {
    overallPercent: number;
    remainingPercent: number;
    gaps: DepthGap[];
  };
}

export function PlatformKeysPanel() {
  const [data, setData] = useState<KeysPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform-admin/keys");
    if (!res.ok) {
      toast.error("Could not load integration keys");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setDraft({});
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const secrets: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(draft)) {
      if (value.trim()) secrets[key] = value.trim();
    }
    if (!Object.keys(secrets).length) {
      toast.error("Enter at least one new key value");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/platform-admin/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secrets }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error ?? "Save failed");
      return;
    }
    toast.success(`Saved ${json.updated?.length ?? 0} key(s)`);
    load();
  }

  if (loading || !data) {
    return <div className="h-48 rounded-xl bg-surface-2 animate-pulse" />;
  }

  const { depth } = data;
  const openGaps = depth.gaps.filter((g) => !g.done);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader
          title="Product depth"
          description="What the remaining gap actually is — mostly live ops, not missing code"
          icon={<CheckCircle2 size={16} />}
        />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-3xl font-bold">{depth.overallPercent}%</p>
              <p className="text-sm text-muted-foreground">
                ~{depth.remainingPercent}% remaining to full launch readiness
              </p>
            </div>
            <ProgressBar value={depth.overallPercent} size="md" className="flex-1 max-w-xs" />
          </div>
          <Alert
            type="info"
            title="The ~22% gap on main is not missing features"
            description="Routes and APIs are ~97% built. The gap is: production migrations, live Stripe/Twilio keys, cron jobs, pilot smoke tests, and legal sign-off. Saving keys below closes the integration slice."
          />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Open items ({openGaps.length})</p>
            <ul className="space-y-1.5">
              {openGaps.map((gap) => (
                <li key={gap.id} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">○</span>
                  <span>
                    {gap.label}
                    {gap.hint && (
                      <span className="block text-xs text-muted-foreground">{gap.hint}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Alert
        type="warning"
        title="Platform admin only"
        description="Values are encrypted in platform_settings. Vercel/host environment variables always win when set — use this page when you cannot access the host env directly."
      />

      {data.grouped.map((group) => (
        <Card key={group.id}>
          <CardHeader title={group.label} icon={<KeyRound size={16} />} />
          <div className="space-y-4">
            {group.keys.map((row) => (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium" htmlFor={row.key}>
                    {row.label}
                  </label>
                  <div className="flex items-center gap-2">
                    {row.configured && (
                      <Badge
                        label={row.source === "environment" ? "Env" : "Saved"}
                        color={row.source === "environment" ? "blue" : "green"}
                      />
                    )}
                    {row.masked && (
                      <span className="text-xs text-muted-foreground font-mono">{row.masked}</span>
                    )}
                  </div>
                </div>
                {row.description && (
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                )}
                <Input
                  id={row.key}
                  type={row.secret ? "password" : "text"}
                  placeholder={row.locked ? "Set in host environment (locked)" : row.configured ? "Leave blank to keep current" : `Enter ${row.label}`}
                  disabled={row.locked}
                  value={draft[row.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [row.key]: e.target.value })}
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground font-mono">{row.key}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button icon={<Save size={14} />} loading={saving} onClick={save}>
          Save keys
        </Button>
        <Link href="/settings?tab=integrations">
          <Button variant="secondary" icon={<ExternalLink size={14} />}>
            Chapter integrations (Connect / Plaid)
          </Button>
        </Link>
        <Link href="/api/ready" target="_blank">
          <Button variant="secondary">Open /api/ready</Button>
        </Link>
      </div>
    </div>
  );
}
