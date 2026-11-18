# NIC FleetHub — System Tech Stack & Architecture Specification

National Industries Company (K.S.C.C) — Kuwait Operations

---

## 1. Tech Stack Overview

### Frontend
* **Core Framework:** Vanilla Modern JavaScript (ES6+), custom reactive Micro-SPA component architecture.
* **Build Tooling:** Zero-build static direct pipeline with query cache-busting (`v=2.2.0`); development supported by zero-dependency Node.js dev-server (`frontend/dev-server.js`) with reverse proxy.
* **Styling Library:** Custom Enterprise Design System (`styles.css`, `console.css`) using CSS Custom Properties (CSS variables), Flexbox, CSS Grid, full Bidirectional layout support (LTR English & Hindi, RTL Arabic), and Google Fonts (*Onest*).
* **Routing Architecture:** Custom client-side history state router (`go(view, args)` function with `HIST` navigation stack and URL query parameter binding).
* **Progressive Web App (PWA):** Service Worker (`sw.js`) with Cache Storage (`fleethub-shell-v2.2.0`), offline connectivity monitor (`pwa.js`), and Web App Manifest (`manifest.json`).

### Backend
* **Runtime:** Python 3.11+ (CPython) / Ubuntu Linux (Render) & Windows.
* **Framework:** Flask 3.1+ with modular Blueprint architecture (`src/controllers/`, `src/routes/`).
* **Production WSGI Server:** Gunicorn 27.0+ (`gunicorn.conf.py`, multi-worker, multi-threaded).
* **API Style:** RESTful API over HTTP/HTTPS with JSON payloads, standard status codes (`200`, `201`, `400`, `401`, `403`, `404`, `500`), multipart audio/document uploads, and Server-Sent Events (SSE) streaming.

### Database
* **Database Type:** SQLite 3 relational database (`fleethub.db`) with Foreign Keys enabled and Write-Ahead Logging (`PRAGMA journal_mode=WAL`).
* **Hosting / Storage Location:** Local persistent volume at `backend/data/fleethub.db`, configurable via `FLEETHUB_DATA` and `FLEETHUB_DB` environment variables (supporting Render persistent disks at `/var/data` or `/opt/render/project/src/backend/data`).
* **Database Management:** Transactional migrations runner (`src/database/migrations/runner.py`), automated schema seeder (`src/database/seeds/seed_data.py`), and automated backup snapshots (`backend/data/backups/`).

### Authentication & Authorization
* **Authentication Method:** Secure HTTP-only cookie-based sessions with 256-bit cryptographic session signing (`app.secret_key`).
* **Cookie Security:** `HttpOnly=True`, `SameSite=Lax` (local) / `SameSite=None` + `Secure=True` (cross-domain Vercel $\rightarrow$ Render production), 8-hour session lifetime (`PERMANENT_SESSION_LIFETIME = timedelta(hours=8)`).
* **Role Enforcement:** Declarative Python route decorator `@need(permission_code)` with fine-grained capability checks (`can(p)`).

### Password Hashing
* **Library:** `werkzeug.security` (Python standard security module).
* **Algorithm:** **scrypt** (`scrypt:32768:8:1$...`) with unique per-user cryptographic salt.

### Real-Time Live Sync
* **Three-Tier Real-Time Synchronization Protocol:**
  1. **Server-Sent Events (SSE):** Persistent event stream at `/api/sync/events` delivering instant broadcast payloads on any database mutation.
  2. **HTML5 BroadcastChannel:** Zero-latency cross-tab event bus (`BroadcastChannel("fleethub_sync")`).
  3. **Fallback Poller:** Heartbeat version check at `/api/sync/version` every 3 seconds for offline reconnection and failover.

---

## 2. Frontend Page & Role Access Matrix

### Total Routed Views: **17 Views**
* **15 Authenticated Console Views:**
  1. `dash` — Operational Dashboard
  2. `search` — Global Multi-Entity Search
  3. `asset` — Asset Profile & Maintenance History
  4. `assets` — Fleet & Heavy Equipment Registry
  5. `comp` — Driver Complaints & Fault Reporting
  6. `wo` — Workshop Work Orders & Repair Jobs
  7. `parts` — Spare Parts Warehouse Inventory
  8. `pur` — Sourcing & Purchase Requisitions
  9. `sup` — Approved Suppliers & Dealerships
  10. `exp` — Operating & Maintenance Expense Ledger
  11. `hist` — Pre-Digital Historical Job Cards
  12. `reports` — Engineering, Fleet MTBF & Cost Reports
  13. `alerts` — Operational Alerts & Expiry Hub
  14. `ws` — Worksites & Operating Sectors
  15. `admin` — Users, Roles & Database Backups
* **2 Public & Entry Views:**
  16. `loginView` — Multilingual Session Sign-In Screen
  17. `publicHome` — Landing Portal & Live Public KPI Summary (`index.html` + `app.js`)

### Accessible Pages by Role

| Role | Accessible Page Views | Total Views |
|---|---|:---:|
| **Super Admin** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Expenses, Historical Records, Reports, Worksites, Users & Backups, Alerts | **15** |
| **Company Admin** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Expenses, Historical Records, Reports, Worksites, Users & Backups, Alerts | **15** |
| **Admin** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Expenses, Historical Records, Reports, Worksites, Users & Backups, Alerts | **15** |
| **Management** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases (Approval), Suppliers, Expenses, Historical Records, Reports, Worksites, Alerts | **14** |
| **Mechanical** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Historical Records, Reports, Worksites, Alerts | **13** |
| **Inventory** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Historical Records, Reports, Worksites, Alerts | **13** |
| **Procurement** | Dashboard, Assets, Search, Asset Details, Complaints, Parts, Purchases, Suppliers, Expenses, Historical Records, Reports, Worksites, Alerts | **13** |
| **Workshop** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Purchases, Suppliers, Historical Records, Worksites, Alerts | **12** |
| **Mechanic** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Parts, Suppliers, Historical Records, Worksites, Alerts | **11** |
| **Transport** | Dashboard, Assets, Search, Asset Details, Complaints, Work Orders, Historical Records, Reports, Worksites, Alerts | **10** |
| **Driver** | Complaints (Voice Fault Reporting) | **1** |
