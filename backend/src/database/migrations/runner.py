"""Database migrations runner for NIC FleetHub SQLite schema."""
from ..connection import connect

MIGRATIONS = [
    # Migration 1: Base schema
    """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, pw TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS worksites(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS assets(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL, manufacturer TEXT, brand TEXT, model TEXT, year INTEGER, reg_no TEXT, vin TEXT, engine_no TEXT, serial_no TEXT, operator TEXT, department TEXT, worksite_id INTEGER REFERENCES worksites(id), status TEXT NOT NULL DEFAULT 'Active', purchase_date TEXT, remarks TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS ux_a_reg ON assets(reg_no) WHERE reg_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_a_vin ON assets(vin) WHERE vin IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_a_ser ON assets(serial_no) WHERE serial_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_a_op ON assets(operator);
CREATE TABLE IF NOT EXISTS asset_changes(id INTEGER PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES assets(id), field TEXT, old TEXT, new TEXT, by TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS transfers(id INTEGER PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES assets(id), from_site TEXT, to_site TEXT, by TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS complaints(id INTEGER PRIMARY KEY, code TEXT UNIQUE, asset_id INTEGER NOT NULL REFERENCES assets(id), driver TEXT, location TEXT, category TEXT, description TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'Normal', status TEXT NOT NULL DEFAULT 'New', decided_by TEXT, decision_note TEXT, decided_at TEXT, created_by TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS work_orders(id INTEGER PRIMARY KEY, code TEXT UNIQUE, asset_id INTEGER NOT NULL REFERENCES assets(id), complaint_id INTEGER REFERENCES complaints(id), category TEXT, description TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'Normal', status TEXT NOT NULL DEFAULT 'Pending', assignee TEXT, findings TEXT, created_by TEXT, created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, released_at TEXT);
CREATE TABLE IF NOT EXISTS parts(id INTEGER PRIMARY KEY, stock_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT, manufacturer TEXT, oem_no TEXT, compat TEXT, unit TEXT, qty REAL NOT NULL DEFAULT 0 CHECK(qty>=0), min_qty REAL NOT NULL DEFAULT 0, unit_cost REAL NOT NULL DEFAULT 0, location TEXT);
CREATE INDEX IF NOT EXISTS ix_p_oem ON parts(oem_no);
CREATE TABLE IF NOT EXISTS stock_tx(id INTEGER PRIMARY KEY, part_id INTEGER NOT NULL REFERENCES parts(id), kind TEXT NOT NULL, qty REAL NOT NULL, prev_qty REAL NOT NULL, new_qty REAL NOT NULL, asset_id INTEGER REFERENCES assets(id), wo_id INTEGER REFERENCES work_orders(id), unit_cost REAL, by TEXT, note TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS purchases(id INTEGER PRIMARY KEY, code TEXT UNIQUE, asset_id INTEGER REFERENCES assets(id), wo_id INTEGER REFERENCES work_orders(id), part_id INTEGER REFERENCES parts(id), part_name TEXT NOT NULL, qty REAL NOT NULL CHECK(qty>0), est_price REAL, unit_price REAL, supplier TEXT, invoice_no TEXT, to_stock INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Requested', requested_by TEXT, decided_by TEXT, created_at TEXT NOT NULL, purchased_at TEXT);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY, asset_id INTEGER NOT NULL REFERENCES assets(id), wo_id INTEGER REFERENCES work_orders(id), kind TEXT NOT NULL, amount REAL NOT NULL, ref TEXT, note TEXT, by TEXT, at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS ux_exp_ref ON expenses(ref) WHERE ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, asset_id INTEGER REFERENCES assets(id), wo_id INTEGER REFERENCES work_orders(id), purchase_id INTEGER REFERENCES purchases(id), expense_id INTEGER REFERENCES expenses(id), kind TEXT, filename TEXT NOT NULL, stored TEXT NOT NULL, mime TEXT, by TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, user TEXT, action TEXT, entity TEXT, entity_id TEXT, detail TEXT, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_c_asset ON complaints(asset_id);
CREATE INDEX IF NOT EXISTS ix_w_asset ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS ix_t_asset ON stock_tx(asset_id);
CREATE INDEX IF NOT EXISTS ix_pu_asset ON purchases(asset_id);
CREATE INDEX IF NOT EXISTS ix_e_asset ON expenses(asset_id);
CREATE INDEX IF NOT EXISTS ix_d_asset ON documents(asset_id);
""",
    # Migration 2: Suppliers, Asset Specs, Historical Records, Notifications, Categories
    """
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, contact_person TEXT, phone TEXT, email TEXT, address TEXT, tax_no TEXT, categories TEXT, notes TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_sup_name ON suppliers(name);

ALTER TABLE assets ADD COLUMN equipment_type TEXT;
ALTER TABLE assets ADD COLUMN insurance_policy TEXT;
ALTER TABLE assets ADD COLUMN insurance_expiry TEXT;
ALTER TABLE assets ADD COLUMN reg_expiry TEXT;
ALTER TABLE assets ADD COLUMN warranty_details TEXT;
ALTER TABLE assets ADD COLUMN purchase_cost REAL DEFAULT 0;

ALTER TABLE documents ADD COLUMN complaint_id INTEGER REFERENCES complaints(id);
CREATE INDEX IF NOT EXISTS ix_d_complaint ON documents(complaint_id);

CREATE TABLE IF NOT EXISTS historical_records(id INTEGER PRIMARY KEY, code TEXT UNIQUE, asset_id INTEGER NOT NULL REFERENCES assets(id), record_type TEXT NOT NULL, record_date TEXT NOT NULL, title TEXT NOT NULL, description TEXT, work_order_ref TEXT, invoice_no TEXT, supplier_vendor TEXT, performed_by TEXT, parts_replaced TEXT, cost REAL DEFAULT 0, verified INTEGER NOT NULL DEFAULT 1, missing_info_notes TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_hr_asset ON historical_records(asset_id);
CREATE INDEX IF NOT EXISTS ix_hr_date ON historical_records(record_date);

ALTER TABLE documents ADD COLUMN historical_id INTEGER REFERENCES historical_records(id);
CREATE INDEX IF NOT EXISTS ix_d_hist ON documents(historical_id);

CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), target_role TEXT, title TEXT NOT NULL, message TEXT NOT NULL, kind TEXT NOT NULL, link TEXT, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_notif_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS ix_notif_read ON notifications(read);

CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, UNIQUE(kind, name));

ALTER TABLE purchases ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
ALTER TABLE parts ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
""",
    # Migration 3: Multilingual Support, Voice Recordings & Translations
    """
ALTER TABLE complaints ADD COLUMN voice_doc_id INTEGER REFERENCES documents(id);
ALTER TABLE complaints ADD COLUMN original_lang TEXT;
ALTER TABLE complaints ADD COLUMN original_transcript TEXT;

ALTER TABLE work_orders ADD COLUMN voice_doc_id INTEGER REFERENCES documents(id);
ALTER TABLE work_orders ADD COLUMN original_lang TEXT;
ALTER TABLE work_orders ADD COLUMN original_transcript TEXT;

ALTER TABLE users ADD COLUMN preferred_lang TEXT DEFAULT 'en';
""",
    # Migration 4: Kuwait Fleet, Heavy Equipment, Locations & Multi-Currency Configuration
    """
ALTER TABLE assets ADD COLUMN plate_category TEXT DEFAULT 'Commercial';
ALTER TABLE assets ADD COLUMN inspection_date TEXT;
ALTER TABLE assets ADD COLUMN inspection_expiry TEXT;
ALTER TABLE assets ADD COLUMN insurance_company TEXT DEFAULT 'Gulf Insurance Group (GIG)';
ALTER TABLE assets ADD COLUMN ownership_type TEXT DEFAULT 'Company Owned';
ALTER TABLE assets ADD COLUMN country TEXT DEFAULT 'Kuwait';
ALTER TABLE assets ADD COLUMN governorate TEXT DEFAULT 'Capital';
ALTER TABLE assets ADD COLUMN paci_no TEXT;
ALTER TABLE assets ADD COLUMN civil_id_operator TEXT;

ALTER TABLE worksites ADD COLUMN site_type TEXT DEFAULT 'Project Site';
ALTER TABLE worksites ADD COLUMN governorate TEXT DEFAULT 'Capital';
ALTER TABLE worksites ADD COLUMN paci_no TEXT;
ALTER TABLE worksites ADD COLUMN contact_person TEXT;
ALTER TABLE worksites ADD COLUMN contact_phone TEXT;

ALTER TABLE transfers ADD COLUMN from_worksite_id INTEGER REFERENCES worksites(id);
ALTER TABLE transfers ADD COLUMN to_worksite_id INTEGER REFERENCES worksites(id);
ALTER TABLE transfers ADD COLUMN transfer_reason TEXT;
ALTER TABLE transfers ADD COLUMN meter_reading REAL DEFAULT 0;
ALTER TABLE transfers ADD COLUMN transport_details TEXT;

ALTER TABLE expenses ADD COLUMN currency TEXT DEFAULT 'KWD';
ALTER TABLE expenses ADD COLUMN original_amount REAL;
ALTER TABLE expenses ADD COLUMN exchange_rate REAL DEFAULT 1.0;

ALTER TABLE purchases ADD COLUMN currency TEXT DEFAULT 'KWD';
ALTER TABLE purchases ADD COLUMN original_price REAL;
ALTER TABLE purchases ADD COLUMN exchange_rate REAL DEFAULT 1.0;

CREATE TABLE IF NOT EXISTS exchange_rates(
    id INTEGER PRIMARY KEY,
    currency TEXT UNIQUE NOT NULL,
    rate_to_kwd REAL NOT NULL,
    is_auto INTEGER NOT NULL DEFAULT 1,
    source TEXT,
    last_updated TEXT NOT NULL
);
""",
    # Migration 5: Demo data flag support
    """
ALTER TABLE assets ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE complaints ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parts ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE expenses ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE historical_records ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transfers ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ix_a_demo ON assets(is_demo);
CREATE INDEX IF NOT EXISTS ix_c_demo ON complaints(is_demo);
CREATE INDEX IF NOT EXISTS ix_wo_demo ON work_orders(is_demo);
CREATE INDEX IF NOT EXISTS ix_p_demo ON parts(is_demo);
CREATE INDEX IF NOT EXISTS ix_pu_demo ON purchases(is_demo);
CREATE INDEX IF NOT EXISTS ix_e_demo ON expenses(is_demo);
CREATE INDEX IF NOT EXISTS ix_d_demo ON documents(is_demo);
""",
    # Migration 6: Voice metadata & AI description permanent persistence
    """
ALTER TABLE documents ADD COLUMN duration REAL DEFAULT 0;
ALTER TABLE documents ADD COLUMN original_lang TEXT;
ALTER TABLE documents ADD COLUMN original_transcript TEXT;
ALTER TABLE documents ADD COLUMN english_translation TEXT;
ALTER TABLE documents ADD COLUMN ai_description TEXT;

ALTER TABLE complaints ADD COLUMN ai_description TEXT;
ALTER TABLE work_orders ADD COLUMN ai_description TEXT;
"""
]

def run_migrations():
    """Apply any pending schema migrations."""
    con = connect()
    cur = con.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS schema_version(v INTEGER PRIMARY KEY)")
    r = cur.execute("SELECT MAX(v) FROM schema_version").fetchone()[0]
    v = r if r else 0
    for idx, script in enumerate(MIGRATIONS[v:], start=v + 1):
        for stmt in script.strip().split(";"):
            s = stmt.strip()
            if s:
                try:
                    cur.execute(s)
                except Exception as ex:
                    # Column or index may already exist
                    if "duplicate column" not in str(ex).lower() and "already exists" not in str(ex).lower():
                        pass
        cur.execute("INSERT INTO schema_version(v) VALUES(?)", (idx,))
        con.commit()
    con.close()
