"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkSupport = useCallback(() => {
    const ok = typeof window !== "undefined"
      && "serviceWorker" in navigator
      && "PushManager" in window
      && "Notification" in window;
    setSupported(ok);
    return ok;
  }, []);

  async function enablePush() {
    if (!checkSupport()) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription && vapidKey) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (subscription) {
        const json = subscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        if (user) {
          await supabase.from("profiles").update({ notification_push: true }).eq("id", user.id);
        }
        setSubscribed(true);
        toast.success("Push notifications enabled");
      } else {
        if (user) {
          await supabase.from("profiles").update({ notification_push: true }).eq("id", user.id);
        }
        setSubscribed(true);
        toast.success("Browser notifications enabled");
      }
      setLoading(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable push");
      setLoading(false);
      return false;
    }
  }

  return { supported, subscribed, loading, checkSupport, enablePush };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
