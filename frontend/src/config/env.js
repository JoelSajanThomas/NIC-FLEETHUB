/**
 * NIC FleetHub Frontend Configuration & Environment Settings
 */

const getApiBaseUrl = () => {
  // 1. Explicit window-level environment variable (e.g. from runtime script or Vite)
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.API_BASE_URL) {
    return window.__ENV__.API_BASE_URL;
  }
  // 2. Local storage override (for custom debugging)
  if (typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("FLEETHUB_API_BASE")) {
    return window.localStorage.getItem("FLEETHUB_API_BASE");
  }
  // 3. If running on a different port than 5000 (e.g. standard frontend dev server on 3000),
  // and not using a local proxy, allow configuring backend target:
  if (typeof window !== "undefined" && window.location) {
    const port = window.location.port;
    if (port === "3000" || port === "5173" || port === "8080") {
      // By default dev-server proxies /api to 5000, but if accessed directly cross-origin:
      return window.__DEV_PROXY__ ? "" : "http://127.0.0.1:5000";
    }
  }
  // 4. Default: same-origin API calls (recommended for production and proxied dev)
  return "";
};

export const config = {
  API_BASE_URL: getApiBaseUrl(),
  APP_NAME: "NIC FleetHub",
  COMPANY_NAME: "National Industries Company (K.S.C.C)",
  DEFAULT_COUNTRY: "Kuwait",
  DEFAULT_CURRENCY: "KWD",
  CURRENCY_PRECISION: 3,
  SUPPORTED_LANGUAGES: ["en", "hi", "ar"],
  DEFAULT_LANGUAGE: "en",
  RTL_LANGUAGES: ["ar"],
  POLL_INTERVAL_MS: 3000,
  MAX_UPLOAD_SIZE_BYTES: 25 * 1024 * 1024
};

if (typeof window !== "undefined") {
  window.APP_CONFIG = config;
}

export default config;
