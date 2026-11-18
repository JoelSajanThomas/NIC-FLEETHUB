# NIC FleetHub - REST API & Real-time Stream Documentation

This document describes all HTTP endpoints and real-time streaming interfaces exposed by the backend service (`http://127.0.0.1:5000/api`).

---

## 1. Authentication & Session

### `POST /api/login`
Authenticate a user and establish an encrypted session cookie.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin12345"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "role": "super_admin",
    "perms": ["*"],
    "lang": "en"
  }
  ```
- **Error `401 Unauthorized`**: Wrong username or password.
- **Error `429 Too Many Requests`**: Rate limited after 5 consecutive failures.

### `POST /api/logout`
Terminates the active session and clears cookies.
- **Response `200 OK`**: `{ "ok": 1 }`

### `GET /api/me`
Returns current session profile, permissions, and language setting.
- **Response `200 OK`**: Current user object.

### `POST /api/user/lang`
Updates the authenticated user's preferred application language.
- **Request Body**: `{ "lang": "ar" }` (Supported: `en`, `hi`, `ar`)
- **Response `200 OK`**: `{ "ok": true, "lang": "ar" }`

---

## 2. Real-time Synchronization & Public Stats

### `GET /api/sync/version`
Ultra-fast atomic version check (< 1ms).
- **Response `200 OK`**:
  ```json
  {
    "version": 1794965201504,
    "at": "2026-11-18 07:15:20"
  }
  ```

### `GET /api/sync/events`
Server-Sent Events (`text/event-stream`) streaming real-time database commit notifications.
- **Stream Format**:
  ```text
  data: {"version": 1794965201504, "type": "connect"}

  : heartbeat 1794965221.4

  data: {"version": 1794965205112, "type": "db_commit", "details": {}}
  ```

### `GET /api/public/stats`
Returns aggregated operational metrics for the public homepage preview.
- **Response `200 OK`**:
  ```json
  {
    "version": 1794965201504,
    "fleet": {
      "total": 7,
      "active": 6,
      "under_repair": 1,
      "out_of_service": 0,
      "availability_rate": 85.7,
      "list": [ ... ]
    },
    "operations": {
      "open_work_orders": 2,
      "completed_work_orders": 1,
      "pending_complaints": 1,
      "stages": { ... },
      "priority_work_orders": [ ... ]
    },
    "inventory": {
      "total_parts": 4,
      "low_stock_count": 0,
      "items": [ ... ]
    },
    "sites": { "total_sites": 7 },
    "transfer": { ... },
    "expiries": [ ... ],
    "featured_asset": { ... },
    "total_maintenance_kwd": 192.0
  }
  ```

---

## 3. Fleet & Heavy Equipment

### `GET /api/assets`
Lists all non-archived fleet and equipment units.
- **Query Parameters**:
  - `category` (string, optional)
  - `status` (string, optional)
  - `worksite_id` (integer, optional)
- **Response `200 OK`**: Array of asset objects.

### `POST /api/assets`
Registers a new vehicle or heavy equipment unit.
- **Permissions**: `asset.edit`
- **Request Body**:
  ```json
  {
    "name": "Komatsu PC210-10M0 Heavy Crawler Excavator",
    "category": "Excavator",
    "reg_no": "KUW-EX-9921",
    "plate_category": "Construction",
    "worksite_id": 5,
    "status": "Active"
  }
  ```
- **Response `200 OK`**: `{ "id": 2, "code": "AST-00002" }`

### `PUT /api/assets/<id>`
Updates an existing asset record.
- **Permissions**: `asset.edit`
- **Response `200 OK`**: `{ "ok": 1 }`

### `POST /api/assets/<id>/transfer`
Relocates an asset to another worksite in Kuwait with a relocation slip.
- **Permissions**: `asset.edit`
- **Request Body**:
  ```json
  {
    "to_site_id": 5,
    "reason": "Mobilization for foundations work",
    "odometer_hours": 1485.5,
    "transporter": "Lowbed Truck Fleet #12 / Driver Mansour"
  }
  ```
- **Response `200 OK`**: `{ "ok": 1, "from_site": "Ahmadi Base", "to_site": "Al-Zour Site" }`

---

## 4. Complaints & Work Orders

### `POST /api/complaints`
Submits a driver defect report with optional voice note and photo.
- **Permissions**: `complaint.create`
- **Payload**: `multipart/form-data`
  - `asset_id` (int)
  - `description` (text, English)
  - `original_transcript` (text, verbatim spoken language)
  - `original_lang` (text: `ar`, `hi`, `en`)
  - `priority` (text)
  - `photo` (file, optional)
  - `audio` (file, optional)
- **Response `200 OK`**: `{ "id": 1, "code": "CMP-00001" }`

### `POST /api/complaints/<id>/decide`
Supervisor approval, rejection, or request for more information.
- **Permissions**: `complaint.review`
- **Request Body**: `{ "decision": "approve", "note": "Approved for workshop repair" }`

### `POST /api/work-orders`
Creates a work order directly or from an approved complaint.
- **Permissions**: `wo.manage`
- **Request Body**:
  ```json
  {
    "asset_id": 1,
    "complaint_id": 1,
    "category": "Hydraulic System",
    "description": "Replace main boom seal kit",
    "priority": "High",
    "assignee": "Foreman Salem"
  }
  ```
- **Response `200 OK`**: `{ "id": 1, "code": "WO-00001" }`

### `POST /api/work-orders/<id>/status`
Transitions work order status across lifecycle stages.
- **Permissions**: `wo.update`
- **Request Body**: `{ "status": "In Progress", "note": "Diagnostic completed" }`

---

## 5. Inventory & Spare Parts

### `GET /api/parts`
Lists warehouse spare parts with current on-hand stock and min_qty thresholds.
- **Query Parameter**: `q` (search string)

### `POST /api/parts`
Registers a new part in the catalog.
- **Permissions**: `inventory.manage`
- **Request Body**:
  ```json
  {
    "name": "CAT Hydraulic Filter Cartridge 1R-0716",
    "category": "Filters",
    "unit": "pcs",
    "min_qty": 5,
    "unit_cost": 18.500
  }
  ```

### `POST /api/parts/<id>/issue`
Issues spare parts from workshop stock to a work order.
- **Permissions**: `inventory.issue`
- **Request Body**:
  ```json
  {
    "wo_id": 1,
    "qty": 2,
    "note": "Issued for boom cylinder repair"
  }
  ```
- **Side Effect**: Automatically deducts stock and records a `spare_part` expense in KWD.

---

## 6. External Purchases & Expenses

### `POST /api/purchases`
Requests external spare parts procurement from Kuwait suppliers.
- **Permissions**: `purchase.create`
- **Request Body**:
  ```json
  {
    "wo_id": 1,
    "part_name": "CAT 349D Boom Cylinder Seal Overhaul Kit",
    "qty": 1,
    "est_price": 85.000,
    "currency": "KWD",
    "supplier_id": 1
  }
  ```

### `POST /api/purchases/<id>/record`
Records purchase completion with invoice upload.
- **Permissions**: `purchase.record`
- **Payload**: `multipart/form-data`
  - `unit_price`: 85.000
  - `invoice_no`: "INV-88219"
  - `bill`: (PDF or image file)

### `POST /api/expenses`
Records an approved external maintenance expense in KWD.
- **Permissions**: `expense.manage`
- **Payload**: `multipart/form-data`
  - `wo_id` or `asset_id`
  - `kind`: `external_labour` | `outsourced_service` | `towing` | `external_inspection`
  - `amount`: 45.000
  - `currency`: "KWD"
  - `bill`: (PDF or receipt image)

---

## 7. Demo Data Management

### `GET /api/admin/demo/status`
Returns counts of demonstration records across all operational tables.
- **Permissions**: `user.manage`

### `POST /api/admin/demo/load`
Populates standard Kuwait heavy fleet demonstration data.
- **Permissions**: `user.manage`

### `POST /api/admin/demo/clear`
Permanently clears all demo records and uploaded sample files after creating a backup.
- **Permissions**: `super_admin`, `company_admin`, `admin`
