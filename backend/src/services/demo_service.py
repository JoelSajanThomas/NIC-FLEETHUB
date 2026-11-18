"""Demo Data Management service for demonstrations and complete cleanups."""
import os, threading, sqlite3
from datetime import datetime
from ..config import config
from ..database.connection import connect, db, tx
from ..middleware.error_middleware import Bad
from ..utils.helpers import now

CLEANUP_LOCK = threading.Lock()

def get_demo_counts(c=None):
    """Retrieve counts of all records tagged as demo data."""
    close_at_end = False
    if c is None:
        c = connect()
        close_at_end = True
    try:
        tables = [
            ("assets", "assets"),
            ("complaints", "complaints"),
            ("work_orders", "work_orders"),
            ("parts", "parts"),
            ("stock_tx", "stock_tx"),
            ("purchases", "purchases"),
            ("expenses", "expenses"),
            ("documents", "documents"),
            ("transfers", "transfers"),
            ("historical_records", "historical_records"),
            ("suppliers", "suppliers"),
            ("notifications", "notifications")
        ]
        counts = {}
        for key, tbl in tables:
            try:
                counts[key] = c.execute(f"SELECT COUNT(*) FROM {tbl} WHERE is_demo = 1").fetchone()[0]
            except Exception:
                counts[key] = 0

        total = sum(counts.values())
        loaded = (counts.get("assets", 0) > 0 or total > 0)

        demo_files = [r[0] for r in c.execute("SELECT stored FROM documents WHERE is_demo = 1").fetchall()]
        file_bytes = 0
        for f in demo_files:
            fp = os.path.join(config.UPLOAD_DIR, f)
            if os.path.exists(fp):
                file_bytes += os.path.getsize(fp)

        last_clean = c.execute("SELECT at FROM audit WHERE action='clear_demo_data' ORDER BY id DESC LIMIT 1").fetchone()
        last_cleanup = last_clean[0] if last_clean else None

        return {
            "loaded": loaded,
            "total": total,
            "counts": counts,
            "file_storage_bytes": file_bytes,
            "last_cleanup": last_cleanup
        }
    finally:
        if close_at_end:
            c.close()

def load_demo_dataset(c):
    """Load realistic Kuwait operational demo records."""
    if c.execute("SELECT COUNT(*) FROM assets WHERE is_demo = 1").fetchone()[0] > 0:
        raise Bad("Demo data is already loaded in the system.", 400)

    # 1. Worksites lookup
    ws_shuwaikh = c.execute("SELECT id FROM worksites WHERE name LIKE '%Shuwaikh%'").fetchone()
    ws_sulaibiya = c.execute("SELECT id FROM worksites WHERE name LIKE '%Sulaibiya%'").fetchone()
    ws_mutlaa = c.execute("SELECT id FROM worksites WHERE name LIKE '%Mutlaa%'").fetchone()
    ws_zour = c.execute("SELECT id FROM worksites WHERE name LIKE '%Zour%'").fetchone()
    ws_subiya = c.execute("SELECT id FROM worksites WHERE name LIKE '%Subiya%'").fetchone()

    sid_shuwaikh = ws_shuwaikh[0] if ws_shuwaikh else 1
    sid_sulaibiya = ws_sulaibiya[0] if ws_sulaibiya else sid_shuwaikh
    sid_mutlaa = ws_mutlaa[0] if ws_mutlaa else sid_shuwaikh
    sid_zour = ws_zour[0] if ws_zour else sid_shuwaikh
    sid_subiya = ws_subiya[0] if ws_subiya else sid_shuwaikh

    # 2. Suppliers
    sup1 = c.execute("""
        INSERT INTO suppliers(code, name, contact_person, phone, email, address, categories, is_demo, created_at)
        VALUES('SUP-DEMO-01', 'Mohamed Abdulrahman Al-Bahar (CAT Kuwait Dealer)', 'Tariq Mansoor', '+965 2481 0855', 'parts@albahar.com.kw', 'Shuwaikh Industrial Area 2, Block 1', 'Heavy Equipment, CAT Genuine Parts, Lubricants', 1, ?)
    """, (now(),)).lastrowid

    sup2 = c.execute("""
        INSERT INTO suppliers(code, name, contact_person, phone, email, address, categories, is_demo, created_at)
        VALUES('SUP-DEMO-02', 'Al-Mulla & Behbehani Heavy Commercial Vehicles', 'Waleed Al-Kandari', '+965 2491 2233', 'commercial@almullagroup.com', 'Al-Rai Industrial, Ghazali Expressway', 'Truck Spares, Pneumatics, Brake Systems', 1, ?)
    """, (now(),)).lastrowid

    # 3. Assets
    demo_assets = [
        ("AST-DEMO-01", "Caterpillar 349D2 Hydraulic Excavator", "Excavator", "Hydraulic Heavy Excavator", "Caterpillar", "CAT", "349D2", 2023, "18/45129", "CAT0349D2KWT9901", "CAT-C13-88124", "349D2-KW-001", "Rashed Al-Mutairi", "Heavy Machinery", sid_sulaibiya, "Active", "2023-03-10", 68500.0, "Heavy Equipment", "Gulf Insurance Group (GIG)", "GIG-FLT-2026-9041", "2027-05-30", "2027-04-15", "2027-04-15", "Company Owned", "285091204432", "23980033"),
        ("AST-DEMO-02", "Mercedes-Benz Actros 4144 Tipper 8x4", "Dump truck", "Heavy Tipper Truck", "Mercedes-Benz", "Mercedes", "Actros 4144", 2022, "12/98231", "WDB9341442L88214", "OM501LA-99412", "ACTROS-KW-042", "Tariq Mahmood", "Transport Fleet", sid_shuwaikh, "Active", "2022-08-15", 42200.0, "Commercial", "Gulf Insurance Group (GIG)", "GIG-FLT-2026-7712", "2027-03-15", "2026-12-10", "2026-12-10", "Company Owned", "288041506512", "24810011"),
        ("AST-DEMO-03", "Liebherr LTM 1100-4.2 Mobile Crane 100T", "Tower crane", "All-Terrain Mobile Crane", "Liebherr", "Liebherr", "LTM 1100-4.2", 2021, "15/77341", "LTM110042KWT0033", "D936L-A6-7721", "LTM-KW-100", "Salem Al-Azmi", "Lifting Division", sid_mutlaa, "In Workshop", "2021-11-20", 185000.0, "Heavy Equipment", "Gulf Insurance Group (GIG)", "GIG-FLT-2026-5531", "2027-04-20", "2027-02-28", "2027-02-28", "Company Owned", "281072301198", "24990044"),
        ("AST-DEMO-04", "Volvo FMX 460 Transit Concrete Mixer 12m³", "Transit mixer", "Concrete Transit Mixer", "Volvo", "Volvo", "FMX 460", 2024, "14/33918", "YV2XZ40C8RB99201", "D13K460-12841", "FMX-KW-014", "Naveen Kumar", "Ready Mix Division", sid_zour, "Active", "2024-01-18", 48000.0, "Commercial", "Gulf Insurance Group (GIG)", "GIG-FLT-2026-3391", "2027-08-15", "2027-09-15", "2027-09-15", "Company Owned", "290110405521", "23950055"),
        ("AST-DEMO-05", "Komatsu WA470-8 Heavy Wheel Loader", "Wheel loader", "Earthmoving Wheel Loader", "Komatsu", "Komatsu", "WA470-8", 2022, "19/11024", "KMTWA4708KWT7742", "SAA6D125E-7", "WA470-KW-08", "Hussein Al-Failakawi", "Heavy Machinery", sid_subiya, "Active", "2022-05-12", 54000.0, "Heavy Equipment", "Gulf Insurance Group (GIG)", "GIG-FLT-2026-1102", "2027-06-10", "2027-01-20", "2027-01-20", "Company Owned", "283021903341", "24550066")
    ]

    a_ids = []
    for code, name, cat, eq_type, mfr, brand, model, yr, reg, vin, eng, ser, op, dept, wsid, stat, pdate, pcost, pcat, ins_co, ins_pol, ins_exp, reg_exp, insp_exp, own, civ, paci in demo_assets:
        aid = c.execute("""
            INSERT INTO assets(code, name, category, equipment_type, manufacturer, brand, model, year, reg_no, vin, engine_no, serial_no, operator, department, worksite_id, status, purchase_date, purchase_cost, plate_category, insurance_company, insurance_policy, insurance_expiry, reg_expiry, inspection_expiry, ownership_type, civil_id_operator, paci_no, country, is_demo, created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)
        """, (code, name, cat, eq_type, mfr, brand, model, yr, reg, vin, eng, ser, op, dept, wsid, stat, pdate, pcost, pcat, ins_co, ins_pol, ins_exp, reg_exp, insp_exp, own, civ, paci, 'Kuwait', now())).lastrowid
        a_ids.append(aid)

    # 4. Spare Parts
    p_ids = []
    demo_parts = [
        ("STK-DEMO-CAT716", "CAT Hydraulic Filter Cartridge 1R-0716", "Filters", "Caterpillar", "1R-0716", "CAT 349D / 336D", "pcs", 20, 5, 18.500, "Rack H-12, Shuwaikh", sup1),
        ("STK-DEMO-MBB24", "Mercedes Actros Air Brake Booster Chamber T24", "Brakes", "Knorr-Bremse", "II-19484", "Mercedes Actros 4144", "pcs", 8, 2, 42.750, "Rack B-04, Shuwaikh", sup2),
        ("STK-DEMO-LHS88", "Liebherr Outrigger Pressure Transducer Sensor", "Sensors", "Liebherr", "9842104-01", "Liebherr LTM Series", "pcs", 3, 1, 125.000, "Cabinet S-02, Shuwaikh", sup1),
        ("STK-DEMO-VOLOIL", "Volvo Heavy Synthetic Engine Oil 15W40 208L Drum", "Lubricants", "Volvo Penta", "VDS-4.5", "Volvo FMX / FH", "drums", 5, 2, 145.000, "Oil Store Bay 3", sup2)
    ]
    for stk, name, cat, mfr, oem, compat, unit, qty, minq, cost, loc, supid in demo_parts:
        pid = c.execute("""
            INSERT INTO parts(stock_id, name, category, manufacturer, oem_no, compat, unit, qty, min_qty, unit_cost, location, supplier_id, is_demo)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)
        """, (stk, name, cat, mfr, oem, compat, unit, qty, minq, cost, loc, supid)).lastrowid
        p_ids.append(pid)

    # 5. Complaints
    c1 = c.execute("""
        INSERT INTO complaints(code, asset_id, driver, location, category, description, priority, status, decided_by, decision_note, decided_at, created_by, original_lang, original_transcript, is_demo, created_at)
        VALUES('CMP-DEMO-01', ?, 'Rashed Al-Mutairi', 'South Al-Mutlaa Site Sector N4', 'Hydraulics', 'Severe hydraulic fluid leak from boom lift cylinder seal while digging trenches in rocky soil. Hydraulic pressure drop observed.', 'High', 'Approved', 'workshop', 'Approved for immediate central workshop dispatch.', ?, 'dr', 'ar', 'تسريب زيت هيدروليك شديد من سيل البوم بموقع المطلاع', 1, ?)
    """, (a_ids[0], now(), now())).lastrowid

    c2 = c.execute("""
        INSERT INTO complaints(code, asset_id, driver, location, category, description, priority, status, decided_by, decision_note, decided_at, created_by, original_lang, original_transcript, is_demo, created_at)
        VALUES('CMP-DEMO-02', ?, 'Tariq Mahmood', 'Seventh Ring Road near Sulaibiya', 'Brakes', 'Air brake pressure dropped below 6 bar while hauling 38 tons of aggregate. Red brake warning indicator active.', 'Critical', 'Approved', 'workshop', 'Safety critical brake fault approved for emergency repair.', ?, 'dr', 'hi', 'ब्रेक प्रेशर 6 बार से नीचे जा रहा है भारी लोड के साथ', 1, ?)
    """, (a_ids[1], now(), now())).lastrowid

    # 6. Work Orders
    w1 = c.execute("""
        INSERT INTO work_orders(code, asset_id, complaint_id, category, description, priority, status, assignee, findings, created_by, started_at, is_demo, created_at)
        VALUES('WO-DEMO-01', ?, ?, 'Hydraulic System', 'Disassemble boom cylinder head, inspect chrome rod for sand scores, replace high-pressure hydraulic piston and rod seals, replace return filter cartridge.', 'High', 'In progress', 'Mechanic Ravi', 'Boom cylinder rod seal damaged due to desert dust and abrasive quartz sand. Chrome rod intact without scoring.', 'workshop', ?, 1, ?)
    """, (a_ids[0], c1, now(), now())).lastrowid

    w2 = c.execute("""
        INSERT INTO work_orders(code, asset_id, complaint_id, category, description, priority, status, assignee, findings, created_by, started_at, is_demo, created_at)
        VALUES('WO-DEMO-02', ?, ?, 'Pneumatic Brake System', 'Inspect dual-circuit air brake lines, test air compressor charging rate, replace left rear Type-24 brake booster chamber diaphragm.', 'Critical', 'Parts sourcing', 'Foreman Salem', 'Torn internal rubber diaphragm in rear brake booster chamber causing severe continuous air blow-by.', 'workshop', ?, 1, ?)
    """, (a_ids[1], c2, now(), now())).lastrowid

    # 7. Stock Transactions & Issuing
    c.execute("""
        INSERT INTO stock_tx(part_id, kind, qty, prev_qty, new_qty, asset_id, wo_id, unit_cost, by, note, is_demo, at)
        VALUES(?, 'issue', 2, 20, 18, ?, ?, 18.500, 'inv', 'Issued 2x CAT Hydraulic Filter Cartridges for Boom overhaul', 1, ?)
    """, (p_ids[0], a_ids[0], w1, now()))
    c.execute("UPDATE parts SET qty = 18 WHERE id = ?", (p_ids[0],))

    c.execute("""
        INSERT INTO stock_tx(part_id, kind, qty, prev_qty, new_qty, asset_id, wo_id, unit_cost, by, note, is_demo, at)
        VALUES(?, 'issue', 1, 8, 7, ?, ?, 42.750, 'inv', 'Issued 1x Brake Booster Chamber for emergency repair', 1, ?)
    """, (p_ids[1], a_ids[1], w2, now()))
    c.execute("UPDATE parts SET qty = 7 WHERE id = ?", (p_ids[1],))

    # 8. Purchases & Invoices
    c.execute("""
        INSERT INTO purchases(code, asset_id, wo_id, part_id, part_name, qty, est_price, unit_price, supplier, supplier_id, invoice_no, status, requested_by, decided_by, currency, original_price, exchange_rate, is_demo, created_at, purchased_at)
        VALUES('PUR-DEMO-01', ?, ?, ?, 'CAT 349D Boom Cylinder Seal Overhaul Kit', 1, 85.000, 85.000, 'Mohamed Abdulrahman Al-Bahar (CAT Kuwait Dealer)', ?, 'INV-DEMO-88219', 'Purchased', 'workshop', 'admin', 'KWD', 85.000, 1.0, 1, ?, ?)
    """, (a_ids[0], w1, p_ids[0], sup1, now(), now()))

    # 9. Expenses
    c.execute("""
        INSERT INTO expenses(asset_id, wo_id, kind, amount, ref, note, by, currency, original_amount, exchange_rate, is_demo, at)
        VALUES(?, ?, 'Parts', 37.000, 'EXP-DEMO-001', 'CAT 1R-0716 Hydraulic Filter Cartridges (2 pcs issued from stock)', 'inv', 'KWD', 37.000, 1.0, 1, ?)
    """, (a_ids[0], w1, now()))

    c.execute("""
        INSERT INTO expenses(asset_id, wo_id, kind, amount, ref, note, by, currency, original_amount, exchange_rate, is_demo, at)
        VALUES(?, NULL, 'Inspection', 35.000, 'EXP-DEMO-002', 'Annual Traffic Dept Fahs Fanni Technical Inspection & Renewal Fee', 'admin', 'KWD', 35.000, 1.0, 1, ?)
    """, (a_ids[1], now()))

    # 10. Historical Records
    c.execute("""
        INSERT INTO historical_records(code, asset_id, record_type, record_date, title, description, work_order_ref, invoice_no, supplier_vendor, performed_by, parts_replaced, cost, verified, is_demo, created_by, created_at)
        VALUES('HIST-DEMO-01', ?, 'Maintenance', '2024-05-12', '500-Hour Major Engine & Hydraulic Service', 'Scheduled 500-hour service: replaced engine oil, fuel filters, hydraulic oil filters and checked valve clearance.', 'WO-2024-0412', 'INV-AB-44120', 'Mohamed Abdulrahman Al-Bahar', 'Al-Bahar Field Technician', '1R-0716, 1R-0750, 15W40 Oil 45L', 280.000, 1, 1, 'admin', ?)
    """, (a_ids[0], now()))

    # 11. Transfers
    c.execute("""
        INSERT INTO transfers(asset_id, from_site, to_site, from_worksite_id, to_worksite_id, transfer_reason, meter_reading, transport_details, by, is_demo, at)
        VALUES(?, 'Shuwaikh Central Yard', 'South Al-Mutlaa Project Site', ?, ?, 'Mobilization for residential infrastructure foundation works', 2410.5, 'Heavy Lowbed Carrier 02 / Driver Tariq', 'admin', 1, ?)
    """, (a_ids[0], sid_shuwaikh, sid_mutlaa, now()))

    # 12. Sample Files
    sample_files = [
        ("demo_cat_inspection.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82", "CAT 349D Technical Inspection Certificate (Kuwait).png", "Inspection", a_ids[0], None),
        ("demo_tipper_invoice.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82", "Al-Mulla Knorr-Bremse Commercial Invoice.png", "Invoice", a_ids[1], w2),
        ("demo_voice_breakdown.wav", b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00", "Driver Voice Breakdown Report (Arabic).wav", "Voice Note", a_ids[0], w1)
    ]
    for stored_fn, file_bytes, orig_fn, kind, aid, woid in sample_files:
        fpath = os.path.join(config.UPLOAD_DIR, stored_fn)
        try:
            with open(fpath, "wb") as fp:
                fp.write(file_bytes)
        except Exception:
            pass
        c.execute("""
            INSERT INTO documents(asset_id, wo_id, kind, filename, stored, mime, by, is_demo, at)
            VALUES(?, ?, ?, ?, ?, ?, 'admin', 1, ?)
        """, (aid, woid, kind, orig_fn, stored_fn, 'image/png' if 'png' in stored_fn else 'audio/wav', now()))

    # 13. Notifications
    c.execute("""
        INSERT INTO notifications(target_role, title, message, kind, link, read, is_demo, created_at)
        VALUES('management', 'Demo Breakdown Alert: AST-DEMO-01', 'Critical hydraulic pressure loss reported on CAT 349D Excavator at South Al-Mutlaa.', 'breakdown', '/app', 0, 1, ?)
    """, (now(),))

def clear_demo_dataset(c):
    """Permanently delete all demo data and associated sample files."""
    demo_files = [r[0] for r in c.execute("SELECT stored FROM documents WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)").fetchall()]
    affected_part_ids = [r[0] for r in c.execute("SELECT DISTINCT part_id FROM stock_tx WHERE is_demo = 1").fetchall()]

    counts = {
        "assets": c.execute("SELECT COUNT(*) FROM assets WHERE is_demo = 1").fetchone()[0],
        "complaints": c.execute("SELECT COUNT(*) FROM complaints WHERE is_demo = 1").fetchone()[0],
        "work_orders": c.execute("SELECT COUNT(*) FROM work_orders WHERE is_demo = 1").fetchone()[0],
        "parts": c.execute("SELECT COUNT(*) FROM parts WHERE is_demo = 1").fetchone()[0],
        "stock_tx": c.execute("SELECT COUNT(*) FROM stock_tx WHERE is_demo = 1").fetchone()[0],
        "purchases": c.execute("SELECT COUNT(*) FROM purchases WHERE is_demo = 1").fetchone()[0],
        "expenses": c.execute("SELECT COUNT(*) FROM expenses WHERE is_demo = 1").fetchone()[0],
        "documents": c.execute("SELECT COUNT(*) FROM documents WHERE is_demo = 1").fetchone()[0],
        "transfers": c.execute("SELECT COUNT(*) FROM transfers WHERE is_demo = 1").fetchone()[0],
        "historical_records": c.execute("SELECT COUNT(*) FROM historical_records WHERE is_demo = 1").fetchone()[0],
        "suppliers": c.execute("SELECT COUNT(*) FROM suppliers WHERE is_demo = 1").fetchone()[0],
        "notifications": c.execute("SELECT COUNT(*) FROM notifications WHERE is_demo = 1").fetchone()[0],
    }

    c.execute("DELETE FROM documents WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM stock_tx WHERE is_demo = 1 OR part_id IN (SELECT id FROM parts WHERE is_demo = 1) OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM expenses WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM purchases WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM work_orders WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM complaints WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM transfers WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM asset_changes WHERE asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM historical_records WHERE is_demo = 1 OR asset_id IN (SELECT id FROM assets WHERE is_demo = 1)")
    c.execute("DELETE FROM parts WHERE is_demo = 1")
    c.execute("DELETE FROM suppliers WHERE is_demo = 1")
    c.execute("DELETE FROM assets WHERE is_demo = 1")
    c.execute("DELETE FROM notifications WHERE is_demo = 1")
    c.execute("DELETE FROM audit WHERE is_demo = 1")

    for pid in affected_part_ids:
        is_demo_part = c.execute("SELECT is_demo FROM parts WHERE id = ?", (pid,)).fetchone()
        if is_demo_part and is_demo_part[0] == 0:
            last_tx = c.execute("SELECT new_qty FROM stock_tx WHERE part_id = ? AND is_demo = 0 ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
            if last_tx:
                c.execute("UPDATE parts SET qty = ? WHERE id = ?", (last_tx[0], pid))

    deleted_files = 0
    for stored_fn in demo_files:
        still_referenced = c.execute("SELECT 1 FROM documents WHERE stored = ?", (stored_fn,)).fetchone()
        if not still_referenced:
            fpath = os.path.join(config.UPLOAD_DIR, stored_fn)
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                    deleted_files += 1
                except Exception:
                    pass

    return counts, deleted_files
