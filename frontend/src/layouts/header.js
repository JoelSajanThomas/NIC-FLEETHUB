/**
 * Header layout component
 */
export function renderHeader(user, lang, onLangChange, onLogout) {
  return `
    <header class="app-header">
      <div class="header-brand">
        <img src="/src/assets/logo.webp" alt="NIC FleetHub Logo" class="header-logo" onerror="this.src='/assets/logo.webp';this.onerror=function(){this.src='/assets/logo.png';};" />
      </div>
      <div class="header-actions">
        <div class="lang-selector">
          <select id="headerLangSelect" class="lang-dropdown">
            <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
            <option value="hi" ${lang === "hi" ? "selected" : ""}>हिन्दी (Hindi)</option>
            <option value="ar" ${lang === "ar" ? "selected" : ""}>العربية (Arabic)</option>
          </select>
        </div>
        <div class="user-pill">
          <span class="user-name">${user ? user.name : "Guest"}</span>
          <span class="user-role">${user ? user.role : ""}</span>
        </div>
        <button id="headerLogoutBtn" class="btn btn-outline btn-sm">Sign Out</button>
      </div>
    </header>
  `;
}
