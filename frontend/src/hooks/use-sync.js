/**
 * Synchronization hook/subscriber utility
 */
import { syncEngine } from "../services/sync-engine.js";

export function onSyncUpdate(callback) {
  return syncEngine.subscribe((source, payload) => {
    callback(source, payload);
  });
}

export function broadcastLocalChange(action, details) {
  syncEngine.notifyLocalMutation(action, details);
}
