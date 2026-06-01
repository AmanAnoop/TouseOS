"use client";

import { Building, Save } from "lucide-react";
import { Button, Card, CardHeader, Input, Select } from "@/components/ui";
import { orgTypeLabel } from "@/lib/utils";

export interface OrgProfileFormData {
  name: string;
  campus: string;
  councilOrLeague: string;
  contactEmail: string;
  privacy: string;
  primaryColor: string;
  secondaryColor: string;
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
          <Input label="Organization name" required value={form.name} onChange={(e) => onChange({ name: e.target.value })} disabled={!isAdmin} />
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
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Primary color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="h-9 w-16 rounded-lg border border-border cursor-pointer" value={form.primaryColor} onChange={(e) => onChange({ primaryColor: e.target.value })} disabled={!isAdmin} />
              <span className="text-sm font-mono text-muted-foreground">{form.primaryColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Secondary color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="h-9 w-16 rounded-lg border border-border cursor-pointer" value={form.secondaryColor} onChange={(e) => onChange({ secondaryColor: e.target.value })} disabled={!isAdmin} />
              <span className="text-sm font-mono text-muted-foreground">{form.secondaryColor}</span>
            </div>
          </div>
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
