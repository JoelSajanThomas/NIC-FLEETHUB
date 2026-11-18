/**
 * Centralized API Client for NIC FleetHub Frontend
 * Handles base URL routing, JSON serialization, multipart uploads, credentials, and errors.
 */
import { config } from "../config/env.js";

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function request(endpoint, options = {}) {
  const baseUrl = config.API_BASE_URL || "";
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
    defaultHeaders["Accept"] = "application/json";
  }

  const fetchOptions = {
    ...options,
    credentials: options.credentials || "include",
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  if (fetchOptions.body && typeof fetchOptions.body === "object" && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  try {
    const res = await fetch(url, fetchOptions);

    if (res.status === 204) {
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errorMsg = (data && data.error) || (typeof data === "string" ? data : `Request failed with status ${res.status}`);
      throw new ApiError(errorMsg, res.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || "Network connection error", 0);
  }
}

export const api = {
  get: (url, options) => request(url, { ...options, method: "GET" }),
  post: (url, body, options) => request(url, { ...options, method: "POST", body }),
  put: (url, body, options) => request(url, { ...options, method: "PUT", body }),
  delete: (url, options) => request(url, { ...options, method: "DELETE" }),
  upload: (url, formData, options) => request(url, { ...options, method: "POST", body: formData })
};

if (typeof window !== "undefined") {
  window.apiClient = api;
}

export default api;
