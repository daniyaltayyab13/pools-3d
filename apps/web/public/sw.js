/**
 * Simple POC service worker.
 *
 * Production only:
 * - cache selected app shell routes
 * - cache stable public assets
 * - provide offline fallback
 *
 * Important:
 * We do not cache /_next/static here. Next.js already fingerprints production
 * assets, and caching dev chunks can cause hydration mismatch during local work.
 */

const CACHE_VERSION = "v2";
const SHELL_CACHE = `pools-3d-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `pools-3d-assets-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/studio",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/pools-3d-icon.svg",
  "/icons/pools-3d-maskable.svg",
];

const CORE_ASSETS = [
  "/assets/textures/pool/bright-azure-basecolor.jpg",
  "/assets/textures/pool/bright-azure-normal.jpg",
  "/assets/textures/pool/bright-azure-roughness.jpg",
  "/assets/textures/pool/deep-navy-basecolor.jpg",
  "/assets/textures/pool/deep-navy-normal.jpg",
  "/assets/textures/pool/deep-navy-roughness.jpg",
  "/assets/textures/coping/silver-grey-basecolor.jpg",
  "/assets/textures/coping/silver-grey-roughness.jpg",
  "/assets/textures/deck/greige-basecolor.jpg",
  "/assets/textures/deck/greige-normal.jpg",
  "/assets/textures/deck/greige-roughness.jpg",
  "/assets/textures/water/water-normal.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(ASSET_CACHE).then((cache) => cache.addAll(CORE_ASSETS)),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  /**
   * Do not intercept API calls.
   */
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  /**
   * Do not intercept Next.js chunks.
   *
   * This prevents stale JS bundles from causing hydration mismatches.
   */
  if (url.pathname.startsWith("/_next/")) {
    return;
  }

  /**
   * Stable public assets:
   * cache first because textures/icons do not change often.
   */
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /**
   * Page navigations:
   * network first, then cached shell/offline fallback.
   */
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(ASSET_CACHE);
  cache.put(request, response.clone());

  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match("/offline.html");
  }
}
