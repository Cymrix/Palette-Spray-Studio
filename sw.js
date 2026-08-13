const CACHE_NAME = "palette-spray-studio-v2";
const ASSETS_TO_CACHE = [
  "/Palette-Spray-Studio/",
  "/Palette-Spray-Studio/index.html",
  "/Palette-Spray-Studio/manifest.json"
];

// Install Event - cache the core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate strategy
self.addEventListener("fetch", (event) => {
  // Only handle local HTTP/HTTPS requests (ignores data: URIs, browser extensions, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful requests
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline - fail silently, cached response will be returned if available
          });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
