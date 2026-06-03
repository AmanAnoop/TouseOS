"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=100");
    if (!res.ok) {
      setCount(0);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Array<{ read_at: string | null }>;
    setCount(data.filter((n) => !n.read_at).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("unread-notifications")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, () => refresh())
        .subscribe();
    }

    subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { count, loading, refresh };
}
