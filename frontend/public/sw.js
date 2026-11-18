/**
 * NIC FleetHub — Service Worker (PWA Engine)
 * National Industries Company (K.S.C.C) Kuwait
 * 
 * Rules:
 * 1. Pre-cache application shell (HTML, CSS, JS, Branding).
 * 2. Strictly DO NOT cache sensitive business data or confidential API responses insecurely.
 * 3. Gracefully handle offline states and network interruptions.
 * 4. Network-first for JavaScript, CSS, and HTML navigations so code updates load immediately.
 */

const CACHE_NAME = "fleethub-shell-v2.2.0";

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
  "/assets/icon-192x192.webp",
  "/assets/icon-512x512.webp",
  "/assets/icon-maskable-192x192.webp",
  "/assets/icon-maskable-512x512.webp",
  "/assets/apple-touch-icon.webp",
  "/assets/favicon-32x32.webp",
  "/assets/favicon-16x16.webp"
];

// 1. Install Event: Cache core shell and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching Application Shell:", CACHE_NAME);
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Failed to pre-cache some assets:", err);
      });
    })
  );
});

// 2. Activate Event: Clean up all outdated caches and take control
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

// 3. Fetch Event: Route dynamic API vs code scripts vs static assets
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

  // C. Code Assets & Navigation (HTML, JS, CSS) -> Strict Network-First with Cache Fallback
  // Guarantees UI bug fixes and improvements load immediately upon refresh without stale caching!
  const isCodeOrNav = req.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname === "/app";

  if (isCodeOrNav) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
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

  // D. Static Media Assets (WebP images, Fonts, Manifest) -> Cache-First with revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
