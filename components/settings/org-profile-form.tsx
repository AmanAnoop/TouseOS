"use client";

import { Building, Save } from "lucide-react";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { ChapterIdentityPicker } from "@/components/settings/chapter-identity-picker";
import { orgTypeLabel } from "@/lib/utils";

export interface OrgProfileFormData {
  name: string;
  campus: string;
  councilOrLeague: string;
  contactEmail: string;
  privacy: string;
  primaryColor: string;
  secondaryColor: string;
  universityId: string;
  greekAffiliationId: string;
}

interface OrgProfileFormProps {
  form: OrgProfileFormData;
  org: Record<string, unknown> | null;
  isAdmin: boolean;
  saving?: boolean;
  onChange: (updates: Partial<OrgProfileFormData>) => void;
  onSave: () => void;
}

export function OrgProfileForm({ form, org, isAdmin, saving, onChange, onSave }: OrgProfileFormProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Organization profile" icon={<Building size={16} />} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Organization name"
            required
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={!isAdmin}
            hint="Used in SMS as the sender label (e.g. Alpha Chi: meeting at 7pm)."
          />
          <Input label="Campus / University" value={form.campus} onChange={(e) => onChange({ campus: e.target.value })} disabled={!isAdmin} />
          <Input label="Council or League" placeholder="IFC, Panhellenic, Campus Rec" value={form.councilOrLeague} onChange={(e) => onChange({ councilOrLeague: e.target.value })} disabled={!isAdmin} />
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} disabled={!isAdmin} />
          <Select
            label="Privacy"
            value={form.privacy}
            onChange={(e) => onChange({ privacy: e.target.value })}
            options={[{ value: "private", label: "Private — members only" }, { value: "public", label: "Public — visible to all" }]}
            disabled={!isAdmin}
          />
        </div>
        <div className="mt-4">
          <ChapterIdentityPicker
            orgType={String(org?.type ?? "fraternity")}
            disabled={!isAdmin}
            value={{
              universityId: form.universityId,
              greekAffiliationId: form.greekAffiliationId,
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
            }}
            onChange={(identity) => onChange({
              universityId: identity.universityId,
              greekAffiliationId: identity.greekAffiliationId,
              primaryColor: identity.primaryColor,
              secondaryColor: identity.secondaryColor,
            })}
          />
        </div>
        {isAdmin && (
          <Button onClick={onSave} loading={saving} icon={<Save size={14} />} className="mt-4">
            Save changes
          </Button>
        )}
      </Card>

      <Card>
        <CardHeader title="Organization info" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Type", value: orgTypeLabel(String(org?.type ?? "")) },
            { label: "Created", value: org?.created_at ? new Date(String(org.created_at)).toLocaleDateString() : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-surface-1 rounded-lg">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium capitalize">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
