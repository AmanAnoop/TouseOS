"use client";

import { Save } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import {
  NOTIFICATION_TYPE_OPTIONS,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences;
  channels?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  onChannelChange?: (key: "email" | "sms" | "push", value: boolean) => void;
  onPreferenceChange: (key: keyof NotificationPreferences, value: boolean) => void;
  onSave: () => void;
  saving?: boolean;
  showChannels?: boolean;
}

export function NotificationPreferencesForm({
  preferences,
  channels,
  onChannelChange,
  onPreferenceChange,
  onSave,
  saving,
  showChannels = true,
}: NotificationPreferencesFormProps) {
  return (
    <div className="space-y-4">
      {showChannels && channels && onChannelChange && (
        <Card>
          <CardHeader title="Notification channels" />
          <div className="space-y-3">
            {[
              { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
              { key: "sms" as const, label: "SMS notifications", desc: "Text messages for urgent updates" },
              { key: "push" as const, label: "Push notifications", desc: "Browser alerts (enable below)" },
            ].map((pref) => (
              <div key={pref.key} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <input
                  type="checkbox"
                  className="rounded mt-0.5"
                  checked={Boolean(channels[pref.key])}
                  onChange={(e) => onChannelChange(pref.key, e.target.checked)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Notification types" description="Choose which alerts you receive" />
        <div className="space-y-2">
          {NOTIFICATION_TYPE_OPTIONS.map((pref) => (
            <div key={pref.key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <label htmlFor={`pref-${pref.key}`} className="text-sm cursor-pointer">{pref.label}</label>
              <input
                id={`pref-${pref.key}`}
                type="checkbox"
                className="rounded"
                checked={preferences[pref.key]}
                onChange={(e) => onPreferenceChange(pref.key, e.target.checked)}
              />
            </div>
          ))}
        </div>
        <Button onClick={onSave} loading={saving} icon={<Save size={14} />} className="mt-3">
          Save preferences
        </Button>
      </Card>
    </div>
  );
}
