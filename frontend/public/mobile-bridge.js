/**
 * NIC FleetHub — Unified Cross-Platform Bridge
 * National Industries Company (K.S.C.C) Kuwait
 * 
 * Harmonizes Native Mobile (Capacitor), Desktop (Electron/Tauri), PWA, and Web Browser environments.
 */

(function () {
  "use strict";

  const PlatformBridge = {
    // 1. Platform Detection
    detectPlatform() {
      const ua = navigator.userAgent || "";
      const isCapacitor = typeof window.Capacitor !== "undefined" && window.Capacitor.isNativePlatform();
      const isElectron = typeof window.desktopAPI !== "undefined" && window.desktopAPI.isDesktop;
      const isStandalonePWA = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

      if (isCapacitor) {
        return window.Capacitor.getPlatform(); // 'android' or 'ios'
      }
      if (isElectron) {
        return process?.platform === "darwin" ? "macos" : "windows";
      }
      if (isStandalonePWA) {
        return /iPhone|iPad|iPod/.test(ua) ? "ios-pwa" : "android-pwa";
      }
      if (/iPhone|iPad|iPod/.test(ua)) return "ios-web";
      if (/Android/.test(ua)) return "android-web";
      if (/Macintosh|Mac OS X/.test(ua)) return "macos-web";
      return "windows-web";
    },

    // 2. Hardware Camera & Photo Evidence Capture
    async capturePhoto() {
      // If running inside Capacitor Native Container with Camera Plugin
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
        try {
          const image = await window.Capacitor.Plugins.Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: "base64",
            source: "PROMPT" // Prompt user: Camera or Photo Library
          });
          return {
            base64: `data:image/jpeg;base64,${image.base64String}`,
            format: image.format
          };
        } catch (e) {
          console.warn("[Bridge] Native camera prompt cancelled or denied:", e);
          return null;
        }
      }

      // Fallback: Trigger standard HTML5 file picker with camera environment capture
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment"; // Prefer rear equipment camera
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = () => resolve({ base64: reader.result, file });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    // 3. Document & Work Order Printing
    async printDocument() {
      if (window.desktopAPI && window.desktopAPI.printDialog) {
        return await window.desktopAPI.printDialog();
      }
      window.print();
      return { success: true };
    },

    // 4. File Downloading & Export Handling
    async downloadFile(defaultName, base64Data) {
      if (window.desktopAPI && window.desktopAPI.downloadFile) {
        return await window.desktopAPI.downloadFile({ defaultName, dataBase64: base64Data });
      }

      // Standard browser anchor download
      const a = document.createElement("a");
      a.href = base64Data.startsWith("data:") ? base64Data : `data:application/octet-stream;base64,${base64Data}`;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    },

    // 5. Safe Area Inset Adaptation (Mobile Notches & Navigation Bars)
    applySafeAreaAdjustments() {
      const platform = this.detectPlatform();
      document.documentElement.setAttribute("data-platform", platform);
      if (platform.startsWith("ios") || platform.startsWith("android")) {
        document.body.classList.add("mobile-device");
      }
    }
  };

  // Auto-initialize safe area adaptation
  window.addEventListener("DOMContentLoaded", () => {
    PlatformBridge.applySafeAreaAdjustments();
    console.log(`[NIC FleetHub] Initialized on platform: ${PlatformBridge.detectPlatform()}`);
  });

  window.FleetHubBridge = PlatformBridge;
})();
