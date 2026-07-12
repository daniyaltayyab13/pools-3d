"use client";

import { useEffect } from "react";

const PWA_CACHE_PREFIX = "pools-3d-";

/**
 * Registers the service worker only in production.
 *
 * Important:
 * In local development, service workers can cache old Next.js chunks and cause
 * hydration mismatch errors. So in development we unregister existing service
 * workers and clear PWA caches.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister())
          )
        )
        .catch((error) => {
          console.error("Service worker cleanup failed:", error);
        });

      if ("caches" in window) {
        caches
          .keys()
          .then((cacheNames) =>
            Promise.all(
              cacheNames
                .filter((cacheName) => cacheName.startsWith(PWA_CACHE_PREFIX))
                .map((cacheName) => caches.delete(cacheName))
            )
          )
          .catch((error) => {
            console.error("PWA cache cleanup failed:", error);
          });
      }

      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
