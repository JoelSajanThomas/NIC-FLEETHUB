/**
 * NIC FleetHub — Service Worker (PWA Engine)
 * National Industries Company (K.S.C.C) Kuwait
 * 
 * Rules:
 * 1. Pre-cache application shell (HTML, CSS, JS, Branding).
 * 2. Strictly DO NOT cache sensitive business data or confidential API responses insecurely.
 * 3. Gracefully handle offline states and network interruptions.
 */

const CACHE_NAME = "fleethub-shell-v1.0.1";

// Static UI Assets (Application Shell)
const STATIC_ASSETS = [
  "/",
  "/app",
  "/index.html",
  "/app.html",
  "/styles.css",
  "/console.css",
  "/app.js",
  "/console.js",
  "/manifest.json",
  "/assets/logo.webp",
  "/assets/logo-mark.webp",
  "/assets/truck.webp",
  "/assets/icon-192x192.png",
  "/assets/icon-512x512.png",
  "/assets/icon-maskable-192x192.png",
  "/assets/icon-maskable-512x512.png",
  "/assets/apple-touch-icon.png",
  "/assets/favicon-32x32.png",
  "/assets/favicon-16x16.png"
];

// 1. Install Event: Cache core shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching Application Shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Failed to pre-cache some assets:", err);
      });
    })
  );
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Route static shell vs dynamic API
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // A. Non-GET requests (POST, PUT, DELETE) -> Network Only
  if (req.method !== "GET") {
    return;
  }

  // B. API & Uploads Requests -> Strict Network-First with safe offline JSON response
  // NEVER cache confidential company records, financial ledger, or employee credentials!
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({
            ok: false,
            offline: true,
            error: "Kuwait FleetHub Server unreachable. Network connection offline.",
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-FleetHub-Offline": "true"
            }
          }
        );
      })
    );
    return;
  }

  // C. HTML Navigation Requests (e.g. visiting / or /app)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (url.pathname.startsWith("/app")) {
            return caches.match("/app.html");
          }
          return caches.match("/index.html");
        });
      })
    );
    return;
  }

  // D. Static Assets (CSS, JS, WebP images, Fonts, Manifest) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
