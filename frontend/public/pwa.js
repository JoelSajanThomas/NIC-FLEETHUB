/**
 * NIC FleetHub — Progressive Web App & Offline Connectivity Engine
 * National Industries Company (K.S.C.C) Kuwait
 */

(function () {
  "use strict";

  let deferredPrompt = null;
  let offlineBanner = null;
  let refreshing = false;

  // 1. Service Worker Registration & Controller Change
  if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    // Auto-reload once when a new service worker takes over control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        console.log("[PWA] Service Worker controller updated. Refreshing page...");
        window.location.reload();
      }
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered successfully, scope:", reg.scope);
          
          // Check for worker updates
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  showToast("NIC FleetHub updated to latest version. Reloading...", 2000);
                  setTimeout(() => {
                    if (!refreshing) {
                      refreshing = true;
                      window.location.reload();
                    }
                  }, 1000);
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    });
  }

  // 2. Install Prompt (A2HS - Add to Home Screen)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("[PWA] Application install prompt captured");

    // Reveal custom install button if present in UI
    const installBtns = document.querySelectorAll(".btn-install-pwa, [data-action='install-pwa']");
    installBtns.forEach((btn) => {
      btn.style.display = "inline-flex";
      btn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("[PWA] User choice outcome:", outcome);
        deferredPrompt = null;
        installBtns.forEach((b) => (b.style.display = "none"));
      };
    });
  });

  window.addEventListener("appinstalled", () => {
    console.log("[PWA] NIC FleetHub successfully installed as native application");
    deferredPrompt = null;
  });

  // 3. Network Connectivity Monitoring
  function createOfflineBanner() {
    if (document.getElementById("fleethub-conn-banner")) return document.getElementById("fleethub-conn-banner");
    const banner = document.createElement("div");
    banner.id = "fleethub-conn-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      background: #dc2626;
      color: #ffffff;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.45rem 1rem;
      display: none;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: all 0.3s ease;
    `;
    banner.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
      <span id="fleethub-conn-text">Kuwait Central Server Offline — Operating in cached offline mode</span>
    `;
    document.body.prepend(banner);
    return banner;
  }

  function updateOnlineStatus(isOnline) {
    if (!offlineBanner) offlineBanner = createOfflineBanner();
    const bannerText = document.getElementById("fleethub-conn-text");
    if (!isOnline) {
      offlineBanner.style.background = "#b91c1c";
      offlineBanner.style.display = "flex";
      if (bannerText) bannerText.textContent = "Kuwait Central Server Offline — Reconnecting automatically when signal returns...";
    } else {
      offlineBanner.style.background = "#15803d";
      if (bannerText) bannerText.textContent = "Central Server Connection Restored — Synchronized with Kuwait Central Workshop";
      setTimeout(() => {
        if (navigator.onLine && offlineBanner) {
          offlineBanner.style.display = "none";
        }
      }, 3000);
    }
  }

  window.addEventListener("online", () => updateOnlineStatus(true));
  window.addEventListener("offline", () => updateOnlineStatus(false));

  // Initial check
  if (!navigator.onLine) {
    window.addEventListener("DOMContentLoaded", () => updateOnlineStatus(false));
  }

  // Periodic heartbeat verification (verifying live backend connectivity beyond local WiFi)
  setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch("/api/sync/version", { method: "GET", cache: "no-store" });
      if (!res.ok && res.status >= 500) {
        updateOnlineStatus(false);
      }
    } catch (e) {
      updateOnlineStatus(false);
    }
  }, 45000);

  function showToast(msg, duration = 3000) {
    const t = document.getElementById("t");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), duration);
  }

  // Export to global scope
  window.FleetHubPWA = {
    installPrompt: () => {
      if (deferredPrompt) deferredPrompt.prompt();
    },
    hasInstallPrompt: () => !!deferredPrompt,
    isOnline: () => navigator.onLine
  };
})();
