"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Shield } from "lucide-react";
import { Alert, Button, Card, CardHeader, Select } from "@/components/ui";
import { can, type RoleName } from "@/lib/permissions";

export interface PhotoPermissions {
  who_can_upload: "all_members" | "officers_only" | "pr_team";
  require_approval: boolean;
  auto_instagram_ready: boolean;
  officer_only_albums: boolean;
}

const DEFAULT_PERMISSIONS: PhotoPermissions = {
  who_can_upload: "all_members",
  require_approval: true,
  auto_instagram_ready: false,
  officer_only_albums: false,
};

interface PhotoPermissionsPanelProps {
  orgId: string | null;
  role: RoleName;
}

export function PhotoPermissionsPanel({ orgId, role }: PhotoPermissionsPanelProps) {
  const [perms, setPerms] = useState<PhotoPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = can(role, "manage_org_settings") || can(role, "approve_photos");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await fetch(`/api/org/settings?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) {
      const { org } = await res.json();
      const settings = (org?.settings ?? {}) as Record<string, unknown>;
      const saved = (settings.photo_permissions ?? {}) as Partial<PhotoPermissions>;
      setPerms({ ...DEFAULT_PERMISSIONS, ...saved });
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!orgId) return;
    setSaving(true);
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        settingsPatch: { photo_permissions: perms },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Could not save");
      return;
    }
    toast.success("Photo permissions saved");
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading permissions…</p>;
  }

  return (
    <Card>
      <CardHeader
        title="Posting permissions"
        description="Control who can upload photos and what happens after approval"
        icon={<Shield size={16} />}
        action={canEdit ? <Button size="sm" loading={saving} onClick={save}>Save</Button> : undefined}
      />

      {!canEdit && (
        <Alert type="info" title="Officers only" description="Contact your PR chair or president to change posting rules." />
      )}

      <div className="space-y-4">
        <Select
          label="Who can upload photos"
          value={perms.who_can_upload}
          disabled={!canEdit}
          onChange={(e) => setPerms({ ...perms, who_can_upload: e.target.value as PhotoPermissions["who_can_upload"] })}
          options={[
            { value: "all_members", label: "All active members" },
            { value: "officers_only", label: "Officers only" },
            { value: "pr_team", label: "PR / social team" },
          ]}
        />

        {[
          {
            key: "require_approval" as const,
            label: "Require officer approval before posting",
            description: "Uploaded photos stay pending until approved.",
          },
          {
            key: "auto_instagram_ready" as const,
            label: "Mark approved photos Instagram-ready automatically",
            description: "Approved photos appear in content packs without a second step.",
          },
          {
            key: "officer_only_albums" as const,
            label: "Default new albums to officers-only",
            description: "Members can still view approved public albums.",
          },
        ].map((opt) => (
          <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="rounded mt-0.5"
              disabled={!canEdit}
              checked={perms[opt.key]}
              onChange={(e) => setPerms({ ...perms, [opt.key]: e.target.checked })}
            />
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}
