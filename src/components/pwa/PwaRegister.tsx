"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in the browser.
 *
 * Service worker gives us:
 * - offline cache
 * - app install behavior support
 * - faster repeat visits
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    });
  }, []);

  return null;
}
