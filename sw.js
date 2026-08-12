// Excellence Store POS — Service Worker
// Purpose: make the app installable and usable offline.
// It does NOT touch your data (that all lives in IndexedDB, untouched).

const CACHE_NAME = "excellence-store-pos-v6";
// Everything (manifest, icons) is now embedded inside index.html itself,
// so the app shell is just the one file plus its own root URL.
const CORE_ASSETS = [
  "./",
  "./index.html"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell/static files, network-first fallback for everything else
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (e.g. POST) pass through
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((networkResponse) => {
          // Cache same-origin successful responses for next time offline
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            req.url.startsWith(self.location.origin)
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached: fall back to the app shell for navigation requests
          if (req.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
