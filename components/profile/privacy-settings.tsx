"use client";

import { Save } from "lucide-react";
import { Alert, Button, Card, CardHeader } from "@/components/ui";

const VISIBILITY_OPTIONS = [
  { value: "org_members", label: "All members", description: "Every member in your org can see your profile" },
  { value: "officers_only", label: "Officers only", description: "Only officers and admins can see your profile" },
  { value: "private", label: "Private", description: "Only you and admins can see your full profile" },
];

interface PrivacySettingsProps {
  profileVisibility: string;
  saving?: boolean;
  onChange: (visibility: string) => void;
  onSave: () => void;
}

export function PrivacySettings({ profileVisibility, saving, onChange, onSave }: PrivacySettingsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Profile visibility" description="Control who sees your member profile" />
        <div className="space-y-3">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                checked={profileVisibility === opt.value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Alert type="info" title="Your data" description="TouseOS never sells your personal data. Emergency contact information is only accessible to officers and org admins." />

      <Button onClick={onSave} loading={saving} icon={<Save size={14} />}>Save privacy settings</Button>
    </div>
  );
}
