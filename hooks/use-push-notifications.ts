"use client";

import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [vapidConfigured, setVapidConfigured] = useState(false);

  const checkSupport = useCallback(() => {
    const ok = typeof window !== "undefined"
      && "serviceWorker" in navigator
      && "PushManager" in window
      && "Notification" in window;
    setSupported(ok);
    if (!ok) setPermission("unsupported");
    return ok;
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!checkSupport()) return;
    setVapidConfigured(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY));
    setPermission(Notification.permission as PushPermission);

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js")
        ?? await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(subscription));
    } catch {
      setSubscribed(false);
    }
  }, [checkSupport]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function enablePush() {
    if (!checkSupport()) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      toast.error("Push is not configured — add VAPID keys to your environment");
      return false;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") {
        toast.error("Notification permission denied");
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Failed to save subscription");

      if (user) {
        await supabase.from("profiles").update({ notification_push: true }).eq("id", user.id);
      }
      setSubscribed(true);
      toast.success("Push notifications enabled");
      setLoading(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable push");
      setLoading(false);
      return false;
    }
  }

  async function disablePush() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = reg ? await reg.pushManager.getSubscription() : null;

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ notification_push: false }).eq("id", user.id);
      }

      setSubscribed(false);
      toast.success("Push notifications disabled");
      setLoading(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disable push");
      setLoading(false);
      return false;
    }
  }

  return {
    supported,
    subscribed,
    loading,
    permission,
    vapidConfigured,
    checkSupport,
    refreshStatus,
    enablePush,
    disablePush,
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
