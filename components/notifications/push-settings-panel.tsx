"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader } from "@/components/ui";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface PushSettingsPanelProps {
  compact?: boolean;
}

export function PushSettingsPanel({ compact }: PushSettingsPanelProps) {
  const push = usePushNotifications();

  if (!push.checkSupport()) {
    return compact ? null : (
      <Alert type="info" title="Push not supported" description="Your browser does not support push notifications." />
    );
  }

  const statusLabel = push.subscribed
    ? "Enabled"
    : push.permission === "denied"
      ? "Blocked"
      : "Off";
  const statusColor = push.subscribed ? "green" : push.permission === "denied" ? "red" : "gray";

  return (
    <Card padding={compact ? "sm" : "md"}>
      <CardHeader
        title="Browser push"
        description="Get alerts even when TouseOS is in the background"
        icon={push.subscribed ? <BellRing size={16} className="text-racing" /> : <Bell size={16} />}
        action={<Badge label={statusLabel} color={statusColor} dot />}
      />

      {!push.vapidConfigured && (
        <Alert
          type="warning"
          title="Push not configured"
          description="Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable server push delivery."
          className="mb-3"
        />
      )}

      {push.permission === "denied" && (
        <Alert
          type="warning"
          title="Notifications blocked"
          description="Enable notifications in your browser settings for this site, then try again."
          className="mb-3"
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {!push.subscribed ? (
          <Button
            size="sm"
            onClick={() => push.enablePush()}
            loading={push.loading}
            disabled={!push.vapidConfigured || push.permission === "denied"}
            icon={<Bell size={14} />}
          >
            Enable push
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => push.disablePush()}
            loading={push.loading}
            icon={<BellOff size={14} />}
          >
            Disable push
          </Button>
        )}
      </div>
    </Card>
  );
}
