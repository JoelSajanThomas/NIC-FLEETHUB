/**
 * Sidebar navigation component
 */
export function renderSidebar(activeTab, perms = []) {
  const isAll = perms.includes("*");
  const can = (p) => isAll || perms.includes(p);

  const items = [
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", show: true },
    { id: "assets", label: "Fleet & Equipment", icon: "truck", show: can("asset.view") },
    { id: "complaints", label: "Complaints & Defects", icon: "alert-triangle", show: true },
    { id: "work-orders", label: "Work Orders", icon: "wrench", show: can("wo.view") },
    { id: "inventory", label: "Spare Parts", icon: "package", show: can("inventory.view") },
    { id: "purchases", label: "Purchases", icon: "shopping-cart", show: can("purchase.create") || can("purchase.approve") },
    { id: "expenses", label: "Expenses", icon: "receipt", show: can("expense.view") },
    { id: "historical", label: "Historical Records", icon: "file-clock", show: can("asset.view") },
    { id: "reports", label: "Reports & Exports", icon: "bar-chart-3", show: can("report.view") },
    { id: "demo", label: "Demo Data", icon: "database", show: can("user.manage") }
  ];

  return `
    <nav class="app-sidebar">
      <ul class="nav-menu">
        ${items.filter(it => it.show).map(it => `
          <li class="nav-item ${activeTab === it.id ? 'active' : ''}" data-tab="${it.id}">
            <a href="#${it.id}" class="nav-link">
              <span class="nav-icon"><i data-lucide="${it.icon}"></i></span>
              <span class="nav-label">${it.label}</span>
            </a>
          </li>
        `).join("")}
      </ul>
    </nav>
  `;
}
