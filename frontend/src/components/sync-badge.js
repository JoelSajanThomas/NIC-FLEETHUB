/**
 * Live Database Synchronization Status Badge
 */
export function renderSyncBadge(isLive = true) {
  return `
    <div class="sync-badge ${isLive ? 'sync-live' : 'sync-offline'}" title="Real-time SQLite database synchronization active">
      <span class="sync-dot"></span>
      <span class="sync-text">${isLive ? 'Live Database Sync' : 'Reconnecting...'}</span>
    </div>
  `;
}
