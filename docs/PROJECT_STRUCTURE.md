# NIC FleetHub - Architectural & Project Structure Documentation

This document describes the decoupled, modular architecture of the **National Industries Company (K.S.C.C)** FleetHub enterprise management platform.

---

## 1. Directory Tree

```text
nic-fleethub/
│
├── frontend/                                   # Client-Side Application Project
│   ├── public/                                 # Static public assets served as-is
│   │   ├── assets/                             # Logos, branding marks, machinery images
│   │   ├── index.html                          # Homepage & Public Website
│   │   └── app.html                            # Enterprise Management Console Shell
│   ├── src/                                    # Modular Frontend Source Code
│   │   ├── api/                                # Typed API client & endpoint modules
│   │   │   ├── client.js                       # Centralized fetch wrapper (error handling, credentials)
│   │   │   ├── auth.js                         # Authentication & language preference
│   │   │   ├── fleet.js                        # Heavy equipment & fleet operations
│   │   │   ├── operations.js                   # Complaints & work orders
│   │   │   ├── inventory.js                    # Spare parts, suppliers & stock transactions
│   │   │   ├── finance.js                      # Expenses, purchases & currency conversions
│   │   │   ├── sync.js                         # Real-time synchronization & SSE streams
│   │   │   ├── voice.js                        # Push-to-talk voice notes & automatic translation
│   │   │   ├── demo.js                         # Demonstration dataset lifecycle & cleanup
│   │   │   └── index.js                        # Barrel export
│   │   ├── assets/                             # Image assets (logos, equipment photos)
│   │   ├── components/                         # Reusable UI component modules
│   │   │   ├── modal.js                        # Accessible modal dialogs
│   │   │   ├── voice-widget.js                 # Voice recorder UI & wave animator
│   │   │   ├── sync-badge.js                   # Real-time sync connectivity indicator
│   │   │   └── demo-banner.js                  # Demo mode banner & quick cleanup trigger
│   │   ├── config/                             # Environment & app configuration
│   │   │   └── env.js                          # Dynamic API base URL & regional Kuwait defaults
│   │   ├── context/                            # Client-side state store
│   │   │   └── app-state.js                    # User session, active tab, notification status
│   │   ├── hooks/                              # Reactive synchronization hooks
│   │   │   └── use-sync.js                     # Sync listener & local broadcast dispatcher
│   │   ├── layouts/                            # Layout wrappers
│   │   │   ├── header.js                       # Top navigation bar, language switcher, profile
│   │   │   ├── sidebar.js                      # Role-aware vertical module navigation
│   │   │   └── footer.js                       # Kuwait enterprise footer
│   │   ├── modules/                            # Dedicated functional modules
│   │   │   ├── fleet-module.js                 # Vehicle registration & worksite relocations
│   │   │   ├── complaints-module.js            # Defect reporting with multilingual voice capture
│   │   │   ├── work-orders-module.js           # Multi-stage repair workflows & approvals
│   │   │   ├── inventory-module.js             # Stock in/out, low stock threshold monitoring
│   │   │   ├── purchases-module.js             # External 3-way matching procurement
│   │   │   ├── expenses-module.js              # Maintenance expense ledger in KWD
│   │   │   ├── historical-module.js            # Historical service record digitization
│   │   │   └── demo-module.js                  # Demo dataset controls & preview
│   │   ├── pages/                              # Page-level controllers
│   │   │   ├── homepage.js                     # Homepage script (Lenis, GSAP, live preview stats)
│   │   │   └── console.js                      # Enterprise console application script
│   │   ├── routes/                             # View routing manager
│   │   │   └── router.js                       # Hash-based view router
│   │   ├── services/                           # Client-side background services
│   │   │   ├── i18n.js                         # Multilingual engine (EN, HI, AR) & RTL manager
│   │   │   ├── audio-recorder.js               # Microphone recording & speech-to-text
│   │   │   └── sync-engine.js                  # Tri-layer real-time sync coordinator
│   │   ├── styles/                             # Cascading Style Sheets
│   │   │   ├── styles.css                      # Homepage & common design tokens
│   │   │   └── console.css                     # Console styles, RTL rules, tables, modals
│   │   └── utils/                              # Formatting & DOM helpers
│   │       ├── formatting.js                   # KWD 3-decimal formatting, date formatters
│   │       └── dom.js                          # DOM query & escaping helpers
│   ├── dev-server.js                           # Zero-dependency Node.js dev server with /api proxy
│   ├── index.html                              # Root homepage entry point
│   ├── app.html                                # Root console entry point
│   ├── .env.example                            # Frontend environment configuration template
│   └── package.json                            # Frontend npm scripts (`npm run dev`)
│
├── backend/                                    # Server-Side Application Project
│   ├── src/                                    # Modular Python Backend Source Code
│   │   ├── app.py                              # Flask application factory & main runner
│   │   ├── config/                             # Backend configuration & environment loader
│   │   │   └── config.py                       # Ports, storage paths, CORS origins, secrets
│   │   ├── controllers/                        # HTTP route controllers / blueprints
│   │   │   ├── auth_controller.py              # Login, logout, session verification, user lang
│   │   │   ├── user_controller.py              # User administration & role toggling
│   │   │   ├── site_controller.py              # Worksites & operational categories
│   │   │   ├── supplier_controller.py          # Kuwait suppliers & vendor catalog
│   │   │   ├── asset_controller.py             # Fleet CRUD, transfers, history, file downloads
│   │   │   ├── complaint_controller.py         # Defect reports & supervisor decisions
│   │   │   ├── work_order_controller.py        # Repair lifecycle & inspection releases
│   │   │   ├── inventory_controller.py         # Catalog parts, stock movements, parts issuing
│   │   │   ├── purchase_controller.py          # Procurement requests & invoice recording
│   │   │   ├── expense_controller.py           # Financial maintenance expense tracking
│   │   │   ├── historical_controller.py        # 3-year historical record digitization
│   │   │   ├── voice_controller.py             # Audio upload & automatic translation
│   │   │   ├── currency_controller.py          # Multi-currency rates & KWD conversions
│   │   │   ├── sync_controller.py              # Version check, SSE stream, public stats
│   │   │   ├── demo_controller.py              # Demo dataset status, loading, and clear
│   │   │   ├── report_controller.py            # CSV exports, dashboard metrics, audit logs
│   │   │   └── inquiry_controller.py           # Public website inquiry submissions
│   │   ├── database/                           # Centralized SQLite Database Layer
│   │   │   ├── connection.py                   # DB connect, tx() context manager, row helpers
│   │   │   ├── migrations/                     # Schema migrations
│   │   │   │   └── runner.py                   # Version-controlled migration runner
│   │   │   ├── seeds/                          # Initial data seeds
│   │   │   │   └── seed_data.py                # Admin user, worksites, categories, currency rates
│   │   │   └── repositories/                   # Data access repositories
│   │   │       ├── asset_repository.py         # Fleet data access
│   │   │       ├── work_order_repository.py    # Work order data access
│   │   │       ├── complaint_repository.py     # Complaints data access
│   │   │       ├── part_repository.py          # Inventory data access
│   │   │       ├── purchase_repository.py      # Purchases data access
│   │   │       ├── expense_repository.py       # Expense data access
│   │   │       └── user_repository.py          # User data access
│   │   ├── middleware/                         # Middleware layers
│   │   │   ├── auth_middleware.py              # Session authentication & role permissions (`need()`)
│   │   │   ├── cors_middleware.py              # CORS headers & OPTIONS preflight handler
│   │   │   └── error_middleware.py             # Standardized JSON error handler (`Bad()`)
│   │   ├── models/                             # Entity schemas & descriptors
│   │   │   └── schemas.py                      # Validation schemas
│   │   ├── routes/                             # Route registration
│   │   │   └── api_router.py                   # Registers all controllers into the app
│   │   ├── services/                           # Business logic services
│   │   │   ├── sync_service.py                 # Real-time sync bus, SSE stream, stats computation
│   │   │   ├── voice_translation_service.py    # English, Hindi & Arabic translation engine
│   │   │   ├── currency_service.py             # Central Bank of Kuwait exchange rate conversions
│   │   │   └── demo_service.py                 # Isolated demo data loading & complete cleanup
│   │   ├── utils/                              # Utilities
│   │   │   └── helpers.py                      # now(), P() parameter parser, CSV generator
│   │   ├── validators/                         # Input validators
│   │   │   └── request_validators.py           # Required field checks & number validation
│   │   └── jobs/                               # Maintenance jobs
│   │       └── cleanup_jobs.py                 # Backup rotation & file cleanup
│   ├── data/                                   # Protected server data directory
│   │   ├── fleethub.db                         # Single SQLite primary database
│   │   ├── secret.key                          # Session encryption secret key
│   │   └── backups/                            # Database backup files
│   ├── uploads/                                # Secure backend file storage
│   │   ├── documents/                          # Vehicle registration & inspection PDFs
│   │   ├── invoices/                           # Supplier purchase invoices & receipts
│   │   ├── images/                             # Repair photos
│   │   └── audio/                              # Driver voice notes & recordings
│   ├── tests/                                  # Automated backend test suite
│   │   └── test_api.py                         # End-to-end unit & integration tests
│   ├── .env.example                            # Backend environment configuration template
│   ├── requirements.txt                        # Python dependencies
│   └── package.json                            # Backend npm scripts (`npm run dev`)
│
├── shared/                                     # Shared Types & Constants
│   └── shared-types-and-constants/
│       ├── constants.json                      # Machine-readable JSON constants
│       ├── constants.js                        # JavaScript ES Module constants
│       └── constants.py                        # Python constants
│
├── docs/                                       # Project Documentation
│   ├── API_DOCUMENTATION.md                    # REST API endpoints, schemas & SSE
│   ├── DATABASE_SCHEMA.md                      # SQLite database schema, tables & indexes
│   └── PROJECT_STRUCTURE.md                    # This architecture document
│
├── .gitignore                                  # Git exclusion rules
├── README.md                                   # Quickstart & operational guide
└── server.py                                   # Root entry point wrapper
```

---

## 2. Key Separation Guarantees

1. **Zero Database Access from Frontend**: The client-side code interacts strictly with the backend via authenticated HTTP requests (`fetch`). It has zero SQLite or local filesystem dependencies.
2. **Centralized Backend Source of Truth**: All operational business rules, stock deductions, KWD currency calculations, role validations, and database mutations are executed exclusively inside `backend/src/`.
3. **Tri-Layer Real-Time Synchronization**: Changes made in the console or by external clients update the homepage and other tabs instantly through `BroadcastChannel`, `EventSource` (SSE), and a 3-second version polling fallback.
4. **Independent Development Workflows**:
   - Frontend developers can run `cd frontend && npm run dev` on port 3000.
   - Backend developers can run `cd backend && python src/app.py` or `cd backend && npm run dev` on port 5000.
