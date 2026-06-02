import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isNotificationTypeEnabled, parseNotificationPreferences } from "@/lib/notification-preferences";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@touseos.com",
    publicKey,
    privateKey,
  );
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!configureVapid()) return { sent: 0, failed: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_push, notification_preferences")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.notification_push) return { sent: 0, failed: 0 };

  const prefs = parseNotificationPreferences(profile.notification_preferences);
  if (payload.type && !isNotificationTypeEnabled(prefs, payload.type)) {
    return { sent: 0, failed: 0 };
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const pushBody = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody,
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return { sent, failed };
}

export async function dispatchPushForNotification(
  supabase: SupabaseClient,
  params: { userId: string; title: string; body?: string | null; link?: string | null; type?: string },
): Promise<void> {
  await sendPushToUser(supabase, params.userId, {
    title: params.title,
    body: params.body ?? "You have a new notification",
    url: params.link ?? "/notifications",
    type: params.type,
  });
}
