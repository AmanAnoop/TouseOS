"use client";

import { useEffect, useRef } from "react";

interface ScreenshotGuardProps {
  orgId: string;
  roomId: string;
  enabled: boolean;
  disabled?: boolean;
}

export function ScreenshotGuard({ orgId, roomId, enabled, disabled }: ScreenshotGuardProps) {
  const lastAlert = useRef(0);

  useEffect(() => {
    if (!enabled || disabled) return;

    async function report() {
      const now = Date.now();
      if (now - lastAlert.current < 5000) return;
      lastAlert.current = now;

      const form = new FormData();
      form.set("org_id", orgId);
      form.set("room_id", roomId);

      try {
        await fetch("/api/chats/screenshot-alert", { method: "POST", body: form });
      } catch {
        // Best-effort alert
      }
    }

    function onVisibility() {
      if (document.hidden) report();
    }

    function onKeyDown(e: KeyboardEvent) {
      const isPrint = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s";
      const isCapture = e.key === "PrintScreen";
      if (isPrint || isCapture) report();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [orgId, roomId, enabled, disabled]);

  if (!disabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      aria-hidden
    />
  );
}
