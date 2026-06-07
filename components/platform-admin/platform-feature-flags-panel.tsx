"use client";

import { useEffect, useState } from "react";
import { Save, ToggleLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader } from "@/components/ui";

const FLAG_LABELS: Record<string, string> = {
  greekmatch: "GreekMatch",
  interchapter: "Interchapter",
  ai_assistant: "AI Assistant",
  stripe_payments: "Stripe payments",
  social_content_pack: "Social content pack export",
};

export function PlatformFeatureFlagsPanel() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/platform-admin/feature-flags")
      .then((r) => r.json())
      .then((d) => {
        setFlags(d.flags ?? {});
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/platform-admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flags }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    setFlags(data.flags ?? flags);
    toast.success("Feature flags saved");
  }

  if (loading) {
    return <Card className="h-24 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  return (
    <Card>
      <CardHeader
        title="Feature flags"
        description="Toggle product modules platform-wide. Changes apply on next request for gated routes."
        action={
          <Button size="sm" icon={<Save size={14} />} loading={saving} onClick={save}>
            Save flags
          </Button>
        }
      />
      <div className="space-y-3">
        {Object.entries(flags).map(([key, on]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border hover:bg-surface-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ToggleLeft size={18} className={on ? "text-greek-600" : "text-muted-foreground"} />
              <span className="text-sm font-medium">{FLAG_LABELS[key] ?? key}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={on ? "On" : "Off"} color={on ? "green" : "gray"} />
              <input
                type="checkbox"
                className="rounded"
                checked={on}
                onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}
