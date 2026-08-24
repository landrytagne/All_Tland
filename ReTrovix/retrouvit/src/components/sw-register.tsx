"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register service worker
    // Unregister any old service worker to prevent stale cache issues
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        if (registrations.length > 0) {
          console.log("[SW] Unregistering old service workers:", registrations.length);
          registrations.forEach((reg) => reg.unregister());
        }
      })
      .catch(() => {});

    // Clear any old caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      }).catch(() => {});
    }

    // Listen for SW messages
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "UPDATE_AVAILABLE") {
        console.log("[SW] Update available");
      }
    });
  }, []);

  return null;
}
