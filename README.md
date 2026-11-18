# NIC FleetHub — Enterprise Fleet, Workshop & Inventory Management

> **National Industries Company (K.S.C.C) — Kuwait Operations**  
> Professional fleet, heavy equipment, workshop, maintenance, spare parts, and procurement management platform.

---

## 1. Project Architecture

The application is structured into two clearly separated, independently runnable projects:

- **`frontend/`**: Complete client-side application (Public Homepage with GSAP & Lenis animations, Admin Console, multilingual UI supporting English, Hindi, and Arabic with RTL layout, and API client).
- **`backend/`**: Server-side REST APIs, session authentication, role-based access control, SQLite database layer, real-time sync streaming (SSE & BroadcastChannel), Kuwait multi-currency engine, and secure document/audio storage.
- **`shared/`**: Single source of truth constants and enums shared between JavaScript and Python.
- **`docs/`**: Comprehensive API, database schema, and project structure documentation.

```text
nic-fleethub/
├── frontend/             # Client-side user interface (Port 3000)
│   ├── public/           # Static public assets, WebP images, styles & client scripts
│   │   ├── assets/       # Optimized WebP assets (icons, logo, hero)
│   │   ├── index.html    # Public homepage
│   │   ├── app.html      # Enterprise console
│   │   ├── app.js        # Homepage animations & logic
│   │   ├── console.js    # Enterprise console application SPA
│   │   ├── styles.css    # Unified stylesheets
│   │   └── console.css   # Console layout styles
│   ├── dev-server.js     # Zero-dependency development server with backend proxy
│   └── package.json      # Frontend scripts
│
├── backend/              # Server-side APIs & database (Port 5000)
│   ├── src/              # Controllers, database, middleware, services, validators
│   ├── data/             # SQLite database (fleethub.db) & backups
│   ├── uploads/          # Secure file storage (invoices, photos, audio notes)
│   ├── tests/            # Unit & integration test suite
│   ├── requirements.txt  # Python requirements
│   └── package.json      # Backend scripts
│
├── shared/               # Shared constants and enums
│   └── shared-types-and-constants/
│
├── docs/                 # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   └── PROJECT_STRUCTURE.md
│
├── server.py             # Root entry point wrapper
└── run.bat               # Windows quick-launch script
```

---

## 2. Independent Development Commands

### Frontend

Run the frontend independently on port 3000 with automatic `/api` proxying to the backend:

```bash
cd frontend
npm install   # (Optional - dev-server uses built-in Node.js modules)
npm run dev
```

Visit:
- Homepage: `http://localhost:3000/`
- Enterprise Console: `http://localhost:3000/app`

### Backend

Run the backend independently on port 5000:

```bash
cd backend
pip install -r requirements.txt
python src/app.py
```

Or using npm:

```bash
cd backend
npm run dev
```

Run backend unit tests:

```bash
cd backend
npm test
# OR
python -m unittest discover tests
```

### Unified Single-Server Mode (Backwards Compatibility)

You can also run the entire system in unified mode from the project root:

```bash
python server.py
# OR double-click run.bat
```

---

## 3. Environment Configuration

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
- `PORT`: Frontend port (Default: `3000`)
- `BACKEND_HOST`: Backend hostname (Default: `127.0.0.1`)
- `BACKEND_PORT`: Backend port (Default: `5000`)

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
- `PORT`: Backend port (Default: `5000`)
- `FLEETHUB_DATA`: Path to data directory (Default: `./data`)
- `FLEETHUB_DB`: Path to SQLite database file (Default: `./data/fleethub.db`)
- `FLEETHUB_UPLOADS`: Path to uploaded files storage (Default: `./uploads`)
- `FLEETHUB_ADMIN_PASSWORD`: Default admin password for initial seeding (Default: `admin12345`)
- `CORS_ALLOWED_ORIGINS`: Allowed origins (e.g., `http://localhost:3000,http://127.0.0.1:3000`)

---

## 4. Key Features

- **Kuwait Fleet & Heavy Equipment**: Complete PACI building codes, Kuwait plate categories (Commercial, Construction, Private), vehicle inspections (*Fahs Fanni*), Traffic Dept (*Daftar*), and GIG insurance renewal tracking.
- **Tri-Layer Real-Time Synchronization**: Instant cross-tab sync via `BroadcastChannel`, server-push streaming via Server-Sent Events (`/api/sync/events`), and fallback version polling.
- **Multilingual UI & Voice Notes**: English, Hindi, and Arabic with true Right-to-Left (RTL) layout switching and push-to-talk voice note recording.
- **Multi-Currency Finance**: Kuwaiti Dinar (KWD) base currency with 3-decimal fils precision, Central Bank of Kuwait exchange rate conversions, and expense ledgers.
- **Demo Data Management**: Complete demonstration dataset loading and 100% clean, safe removal with automatic pre-cleanup database backup.
