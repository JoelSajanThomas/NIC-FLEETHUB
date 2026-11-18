"""Historical maintenance and service records digitization controller."""
from datetime import datetime
from flask import Blueprint, jsonify, request, session
from ..database.connection import rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.sync_service import notify_sync
from .asset_controller import save_file
from ..utils.helpers import P, now, make_csv_response, parse_csv_file

historical_bp = Blueprint("historical", __name__)

@historical_bp.get("/api/historical")
@need("asset.view")
def hist_list():
    sql = "SELECT h.*, a.code asset_code, a.name asset_name, (SELECT id FROM documents d WHERE d.historical_id=h.id LIMIT 1) doc_id FROM historical_records h JOIN assets a ON a.id=h.asset_id WHERE 1=1"
    args = []
    if request.args.get("asset_id"):
        sql += " AND h.asset_id=?"
        args.append(int(request.args["asset_id"]))
    if request.args.get("record_type"):
        sql += " AND h.record_type=?"
        args.append(request.args["record_type"])
    if request.args.get("verified") in ("0", "1"):
        sql += " AND h.verified=?"
        args.append(int(request.args["verified"]))
    q = (request.args.get("q") or "").strip()
    if q:
        sql += " AND (h.title LIKE ? OR h.description LIKE ? OR h.work_order_ref LIKE ? OR h.invoice_no LIKE ? OR a.name LIKE ? OR a.code LIKE ?)"
        args.extend([f"%{q}%"] * 6)
    sql += " ORDER BY h.record_date DESC, h.id DESC LIMIT 500"
    return jsonify(rows(sql, args))

@historical_bp.post("/api/historical")
@need("asset.edit")
def hist_new():
    p = P()
    aid = int(p.get("asset_id") or 0)
    title = (p.get("title") or "").strip()
    rdate = (p.get("record_date") or "").strip()
    if not aid or not title or not rdate:
        raise Bad("Asset, title and historical record date are required")
    with tx() as c:
        if not c.execute("SELECT 1 FROM assets WHERE id=?", (aid,)).fetchone():
            raise Bad("Asset not found", 404)
        cost = float(p.get("cost") or 0)
        ver = 0 if str(p.get("verified")) in ("0", "false", "no") else 1
        cur = c.execute(
            "INSERT INTO historical_records(asset_id,record_type,record_date,title,description,work_order_ref,invoice_no,supplier_vendor,performed_by,parts_replaced,cost,verified,missing_info_notes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (aid, p.get("record_type") or "service", rdate, title, p.get("description"), p.get("work_order_ref"), p.get("invoice_no"), p.get("supplier_vendor"), p.get("performed_by"), p.get("parts_replaced"), cost, ver, p.get("missing_info_notes"), session["name"], now())
        )
        code = f"HST-{cur.lastrowid:05d}"
        c.execute("UPDATE historical_records SET code=? WHERE id=?", (code, cur.lastrowid))
        f = request.files.get("document") or request.files.get("file")
        if f and f.filename:
            save_file(c, f, asset_id=aid, historical_id=cur.lastrowid, kind="Historical document")
        audit("digitize", "historical_record", code, title[:80])
    notify_sync("historical_create", {"historical_id": cur.lastrowid, "code": code})
    return jsonify(id=cur.lastrowid, code=code)

@historical_bp.get("/api/historical/template")
@need("asset.view")
def hist_template():
    headers = ["asset_code","record_type","record_date","title","description","work_order_ref","invoice_no","supplier_vendor","performed_by","parts_replaced","cost","verified","missing_info_notes"]
    sample = ["AST-00001","service","2023-04-15","50,000 km Major Engine Service","Replaced engine oil, oil filter, air filter, fuel filter, coolant flush","OLD-WO-4412","INV-8821","Gulf Star Spares","Alex","Oil Filter, Air Filter","1250","1",""]
    return make_csv_response("fleethub_historical_template.csv", headers, [sample])

@historical_bp.post("/api/historical/import")
@need("asset.edit")
def hist_import():
    f = request.files.get("file")
    if not f: raise Bad("Choose a CSV file to import")
    records, data_rows = parse_csv_file(f)
    imported = 0
    errors = []
    with tx() as c:
        for idx, r in enumerate(records, start=2):
            if isinstance(r, list): continue
            ident = (r.get("asset_code") or r.get("reg_no") or r.get("serial_no") or r.get("asset_id") or "").strip()
            title = (r.get("title") or r.get("description") or "").strip()
            rdate = (r.get("record_date") or r.get("date") or "").strip()
            if not ident or not title:
                errors.append(f"Row {idx}: missing asset identifier or title")
                continue
            if not rdate:
                rdate = datetime.now().strftime("%Y-%m-%d")
            row_a = c.execute("SELECT id FROM assets WHERE code=? OR reg_no=? OR serial_no=? OR id=?", (ident, ident, ident, ident)).fetchone()
            if not row_a:
                errors.append(f"Row {idx}: Asset '{ident}' not found")
                continue
            cost = float(r.get("cost") or 0)
            ver = 0 if str(r.get("verified", "1")).lower() in ("0", "false") else 1
            cur = c.execute(
                "INSERT INTO historical_records(asset_id,record_type,record_date,title,description,work_order_ref,invoice_no,supplier_vendor,performed_by,parts_replaced,cost,verified,missing_info_notes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (row_a["id"], (r.get("record_type") or "service").lower(), rdate, title, r.get("description") or title, r.get("work_order_ref"), r.get("invoice_no"), r.get("supplier_vendor"), r.get("performed_by"), r.get("parts_replaced"), cost, ver, r.get("missing_info_notes"), session["name"], now())
            )
            code = f"HST-{cur.lastrowid:05d}"
            c.execute("UPDATE historical_records SET code=? WHERE id=?", (code, cur.lastrowid))
            imported += 1
        audit("import", "historical_records", imported, f"{len(errors)} errors" if errors else "all ok")
    if imported > 0:
        notify_sync("historical_import", {"count": imported})
    return jsonify(imported=imported, errors=errors)
