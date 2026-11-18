/**
 * Demo Data active banner component
 */
export function renderDemoBanner(counts = {}) {
  const total = counts.total || 0;
  if (!total) return "";

  return `
    <div class="demo-mode-banner">
      <div class="demo-banner-content">
        <span class="demo-badge">DEMO MODE ACTIVE</span>
        <span class="demo-info">System currently displaying ${total} demonstration records alongside authentic company data.</span>
      </div>
      <button id="quickClearDemoBtn" class="btn btn-sm btn-danger">Clear All Demo Data</button>
    </div>
  `;
}
