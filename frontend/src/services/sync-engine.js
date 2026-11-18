/**
 * Centralized Real-time Synchronization Engine for Frontend
 * Combines BroadcastChannel, EventSource (SSE), and fallback polling.
 */
import { syncApi } from "../api/sync.js";
import { config } from "../config/env.js";

class SyncEngine {
  constructor() {
    this.listeners = new Set();
    this.currentVersion = 0;
    this.broadcastChannel = null;
    this.eventSource = null;
    this.pollTimer = null;
    this.init();
  }

  init() {
    // 1. Local cross-tab sync via BroadcastChannel
    try {
      this.broadcastChannel = syncApi.createBroadcastChannel();
      if (this.broadcastChannel) {
        this.broadcastChannel.onmessage = (event) => {
          this.notifyListeners("local_broadcast", event.data);
        };
      }
    } catch (e) {
      console.warn("[SyncEngine] BroadcastChannel not supported:", e);
    }

    // 2. Server-Sent Events (SSE) server-push stream
    try {
      this.eventSource = syncApi.createEventSource();
      if (this.eventSource) {
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.version && data.version > this.currentVersion) {
              this.currentVersion = data.version;
              this.notifyListeners("sse_event", data);
            }
          } catch (err) {}
        };
      }
    } catch (e) {
      console.warn("[SyncEngine] EventSource error:", e);
    }

    // 3. Lightweight fallback polling
    this.pollTimer = setInterval(async () => {
      try {
        const res = await syncApi.getVersion();
        if (res && res.version && res.version > this.currentVersion) {
          this.currentVersion = res.version;
          this.notifyListeners("poll_version", res);
        }
      } catch (err) {}
    }, config.POLL_INTERVAL_MS || 3000);
  }

  notifyLocalMutation(action, details = {}) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          action,
          details,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(source, payload) {
    this.listeners.forEach((cb) => {
      try {
        cb(source, payload);
      } catch (err) {
        console.error("[SyncEngine] Listener error:", err);
      }
    });
  }

  destroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.eventSource) this.eventSource.close();
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.listeners.clear();
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
