import { api } from "./client.js";
import { config } from "../config/env.js";

export const syncApi = {
  getVersion: () => api.get("/api/sync/version"),
  getPublicStats: () => api.get("/api/public/stats"),
  createEventSource: () => {
    const baseUrl = config.API_BASE_URL || "";
    return new EventSource(`${baseUrl}/api/sync/events`);
  },
  createBroadcastChannel: () => {
    if (typeof BroadcastChannel !== "undefined") {
      return new BroadcastChannel("fleethub_sync");
    }
    return null;
  }
};

export default syncApi;
