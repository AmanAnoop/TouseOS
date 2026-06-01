"use client";

import { useEffect } from "react";

/** Registers the service worker on app load so push is ready when the user opts in. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal — user may enable push later */
    });
  }, []);

  return null;
}
