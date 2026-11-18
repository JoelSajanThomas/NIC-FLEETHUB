"""Asset management controller for fleet & heavy equipment."""
import os, secrets
from flask import Blueprint, jsonify, request, session, send_file
from ..config import config
from ..database.connection import get_db, one, rows, tx, audit, notify
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, can
from ..services.sync_service import notify_sync
from ..utils.helpers import P, now, make_csv_response, parse_csv_file

asset_bp = Blueprint("assets", __name__)

AF = ("name category equipment_type manufacturer brand model year reg_no vin engine_no serial_no "
      "operator department worksite_id status purchase_date purchase_cost insurance_policy insurance_expiry "
      "reg_expiry warranty_details remarks plate_category inspection_date inspection_expiry insurance_company "
      "ownership_type country governorate paci_no civil_id_operator").split()

SF = ("code name category equipment_type manufacturer brand model reg_no vin engine_no serial_no "
      "operator department plate_category paci_no civil_id_operator insurance_policy").split()

def val(k, v):
    v = (str(v).strip() if v is not None else "") or None
    if v and k in ("worksite_id", "year"):
        try: return int(v)
        except Exception: return None
    if v and k in ("purchase_cost", "odometer_hours", "gps_lat", "gps_lng"):
        try: return round(float(v), 3)
        except Exception: return 0.0
    return v

def site(i):
    return (one("SELECT name FROM worksites WHERE id=?", (i,)) or {}).get("name") if i else None

def save_file(c, f, **ids):
    ext = os.path.splitext(f.filename or "")[1].lower().lstrip(".")
    head = f.stream.read(12); f.stream.seek(0)
    is_pdf = (ext == "pdf" and head.startswith(b"%PDF"))
    is_jpg = (ext in ("jpg", "jpeg") and head[:3] == b"\xff\xd8\xff")
    is_png = (ext == "png" and head.startswith(b"\x89PNG"))
    is_audio = ext in ("webm", "wav", "mp3", "ogg", "m4a", "aac", "oga") or (ids.get("kind") == "Voice recording")
    if not (is_pdf or is_jpg or is_png or is_audio):
        raise Bad("Only genuine PDF, JPG, PNG or Audio (WebM, WAV, MP3) files are accepted")
    stored = secrets.token_hex(16) + "." + (ext or "webm")
    f.save(os.path.join(config.UPLOAD_DIR, stored))
    cols = {k: v for k, v in ids.items() if v is not None}
    is_d = 0
    try:
        if cols.get("asset_id"):
            r = c.execute("SELECT is_demo FROM assets WHERE id=?", (cols["asset_id"],)).fetchone()
            if r and r[0]: is_d = 1
        if not is_d and cols.get("wo_id"):
            r = c.execute("SELECT is_demo FROM work_orders WHERE id=?", (cols["wo_id"],)).fetchone()
            if r and r[0]: is_d = 1
        if not is_d and cols.get("complaint_id"):
            r = c.execute("SELECT is_demo FROM complaints WHERE id=?", (cols["complaint_id"],)).fetchone()
            if r and r[0]: is_d = 1
        if not is_d and cols.get("purchase_id"):
            r = c.execute("SELECT is_demo FROM purchases WHERE id=?", (cols["purchase_id"],)).fetchone()
            if r and r[0]: is_d = 1
    except Exception:
        pass
    cols["is_demo"] = is_d
    mime = "application/pdf" if is_pdf else ("image/png" if is_png else ("image/jpeg" if is_jpg else ("audio/" + (ext if ext in ("wav", "mp3", "webm", "ogg") else "webm"))))
    cur = c.execute(
        f"INSERT INTO documents({','.join(cols)},filename,stored,mime,by,at) VALUES({','.join('?' * len(cols))},?,?,?,?,?)",
        [*cols.values(), os.path.basename(f.filename or "recording.webm"), stored, mime, session.get("name") or "system", now()]
    )
    return cur.lastrowid

def timeline(aid, costs):
    a = one("SELECT * FROM assets WHERE id=?", (aid,))
    ev = []
    add = lambda at, t, ref, text, by="", amt=None: ev.append(dict(at=at, type=t, ref=ref, text=text, by=by, amount=amt))
    add(a["created_at"], "Registered", a["code"], f"Asset registered: {a['name']}")
    for r in rows("SELECT * FROM asset_changes WHERE asset_id=?", (aid,)):
        add(r["at"], "Change", "", f"{r['field']}: {r['old'] or '-'} to {r['new'] or '-'}", r["by"])
    for r in rows("SELECT * FROM transfers WHERE asset_id=?", (aid,)):
        txt = f"Moved from {r['from_site'] or '-'} to {r['to_site'] or '-'}"
        if r.get("transporter"): txt += f" via {r['transporter']}"
        if r.get("odometer_hours"): txt += f" ({r['odometer_hours']:g} hrs/km)"
        if r.get("reason"): txt += f" - {r['reason']}"
        add(r["at"], "Location", "", txt, r["by"])
    for r in rows("SELECT * FROM complaints WHERE asset_id=?", (aid,)):
        det = f"[{r['priority']}] {r['category'] or ''}: {r['description']} at {r['location'] or 'unknown location'}"
        if r.get("original_transcript") and r.get("original_transcript") != r["description"]:
            det += f" (Spoken {r.get('original_lang','').upper()}: “{r['original_transcript']}”)"
        add(r["created_at"], "Complaint", r["code"], det, r["driver"])
        if r["decided_at"]:
            add(r["decided_at"], "Complaint decision", r["code"], f"{r['status']}. {r['decision_note'] or ''}", r["decided_by"])
    for r in rows("SELECT * FROM work_orders WHERE asset_id=?", (aid,)):
        add(r["created_at"], "Work order", r["code"], f"[{r['priority']}] {r['category']}: {r['description']}", r["created_by"])
        for k, t in (("started_at", "Work started"), ("completed_at", "Work completed"), ("released_at", "Released")):
            if r[k]:
                add(r[k], t, r["code"], f"Assigned to {r['assignee'] or '-'}. Status: {r['status']}", r["assignee"])
        if r["findings"]:
            add(r["created_at"], "Inspection notes", r["code"], r["findings"])
    for r in rows("SELECT t.*, p.name pname, p.stock_id sid, w.code wcode FROM stock_tx t JOIN parts p ON p.id=t.part_id LEFT JOIN work_orders w ON w.id=t.wo_id WHERE t.asset_id=?", (aid,)):
        add(r["at"], "Spare part " + ("issued" if r["kind"] == "out" else "returned"), r["wcode"] or "", f"{r['qty']:g} x {r['pname']} ({r['sid']})", r["by"], round(r["qty"] * (r["unit_cost"] or 0), 3) if costs else None)
    for r in rows("SELECT * FROM purchases WHERE asset_id=?", (aid,)):
        add(r["created_at"], "External purchase", r["code"], f"Requested {r['qty']:g} x {r['part_name']} from {r['supplier'] or 'supplier TBC'} ({r['status']})", r["requested_by"])
        if r["purchased_at"]:
            add(r["purchased_at"], "Purchase recorded", r["code"], f"Invoice {r['invoice_no'] or '-'} from {r['supplier'] or '-'}", r["decided_by"], round(r["qty"] * (r["unit_price"] or 0), 3) if costs else None)
    if costs:
        for r in rows("SELECT * FROM expenses WHERE asset_id=?", (aid,)):
            add(r["at"], "Expense", r["kind"], r["note"] or "", r["by"], r["amount"])
    for r in rows("SELECT * FROM historical_records WHERE asset_id=? ORDER BY record_date ASC", (aid,)):
        v_tag = "Verified" if r["verified"] else "Unverified"
        det = f"[{v_tag}] {r['title']}: {r['description'] or ''} (Ref: {r['work_order_ref'] or r['invoice_no'] or '-'}, Vendor: {r['supplier_vendor'] or '-'}, By: {r['performed_by'] or '-'})"
        add(r["record_date"], f"Historical {r['record_type'].title()}", r["code"] or "", det, r["created_by"], r["cost"] if r["cost"] and costs else None)
    for r in rows("SELECT * FROM documents WHERE asset_id=?", (aid,)):
        add(r["at"], "Document" if "recording" not in (r["kind"] or "").lower() else "Voice Recording", r["kind"], r["filename"], r["by"])
    return a, sorted(ev, key=lambda e: str(e["at"] or ""))

@asset_bp.post("/api/assets/<int:i>/transfer")
@need("asset.edit")
def asset_transfer(i):
    p = P()
    to_site_id = int(p.get("to_site_id") or 0)
    reason = (p.get("reason") or "").strip()
    odo = float(p.get("odometer_hours") or 0) if p.get("odometer_hours") else None
    transporter = (p.get("transporter") or "").strip()
    with tx() as c:
        a = c.execute("SELECT * FROM assets WHERE id=?", (i,)).fetchone()
        if not a: raise Bad("Asset not found", 404)
        if not to_site_id or not c.execute("SELECT 1 FROM worksites WHERE id=?", (to_site_id,)).fetchone():
            raise Bad("Choose a valid destination Kuwait worksite / branch")
        from_site_id = a["worksite_id"]
        from_name = site(from_site_id)
        to_name = site(to_site_id)
        if from_site_id == to_site_id:
            raise Bad("Destination worksite must be different from current worksite")
        c.execute("UPDATE assets SET worksite_id=? WHERE id=?", (to_site_id, i))
        is_d = a["is_demo"] if "is_demo" in a.keys() else 0
        c.execute("""INSERT INTO transfers(asset_id, from_site, to_site, from_worksite_id, to_worksite_id, transfer_reason, meter_reading, transport_details, by, is_demo, at)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                  (i, from_name, to_name, from_site_id, to_site_id, reason or None, odo, transporter or None, session["name"], is_d, now()))
        audit("transfer", "asset", a["code"], f"Relocated from {from_name or 'None'} to {to_name}")
        notify("workshop", f"Asset {a['code']} Transferred", f"{a['name']} moved to {to_name}. Transporter: {transporter or 'Direct'}", kind="transfer", link=f"#asset:{i}")
    notify_sync("asset_transfer", {"asset_id": i, "from_site": from_name, "to_site": to_name})
    return jsonify(ok=1, from_site=from_name, to_site=to_name)

@asset_bp.post("/api/assets")
@need("asset.edit")
def asset_new():
    p = P()
    d = {k: val(k, p.get(k)) for k in AF}
    if not d["name"] or not d["category"]: raise Bad("Name and category are required")
    d["status"] = d["status"] or "Active"
    with tx() as c:
        cur = c.execute(f"INSERT INTO assets({','.join(AF)},created_at) VALUES({','.join('?' * len(AF))},?)", [d[k] for k in AF] + [now()])
        code = f"AST-{cur.lastrowid:05d}"
        c.execute("UPDATE assets SET code=? WHERE id=?", (code, cur.lastrowid))
        audit("create", "asset", code, d["name"])
    notify_sync("asset_create", {"asset_id": cur.lastrowid, "code": code})
    return jsonify(id=cur.lastrowid, code=code)

@asset_bp.put("/api/assets/<int:i>")
@need("asset.edit")
def asset_edit(i):
    p = P()
    with tx() as c:
        a = c.execute("SELECT * FROM assets WHERE id=?", (i,)).fetchone()
        if not a: raise Bad("Asset not found", 404)
        for k in AF:
            if k not in p: continue
            n = val(k, p[k]); o = a[k]
            if str(o or "") == str(n or ""): continue
            if k in ("name", "category") and not n: raise Bad("Name and category cannot be empty")
            c.execute(f"UPDATE assets SET {k}=? WHERE id=?", (n, i))
            if k == "worksite_id":
                c.execute("INSERT INTO transfers(asset_id,from_site,to_site,by,at) VALUES(?,?,?,?,?)", (i, site(o), site(n), session["name"], now()))
            else:
                c.execute("INSERT INTO asset_changes(asset_id,field,old,new,by,at) VALUES(?,?,?,?,?,?)", (i, k, o, n, session["name"], now()))
        audit("edit", "asset", a["code"])
    notify_sync("asset_edit", {"asset_id": i})
    return jsonify(ok=1)

@asset_bp.post("/api/assets/<int:i>/archive")
@need("asset.edit")
def asset_arch(i):
    with tx() as c:
        a = c.execute("SELECT * FROM assets WHERE id=?", (i,)).fetchone()
        if not a: raise Bad("Asset not found", 404)
        c.execute("UPDATE assets SET archived=?, status=? WHERE id=?", (0 if a["archived"] else 1, "Active" if a["archived"] else "Retired", i))
        audit("restore" if a["archived"] else "archive", "asset", a["code"])
    notify_sync("asset_archive", {"asset_id": i})
    return jsonify(ok=1)

@asset_bp.get("/api/assets")
@need("asset.view")
def assets():
    sql = "SELECT a.*, w.name worksite FROM assets a LEFT JOIN worksites w ON w.id=a.worksite_id WHERE 1=1"
    args = []
    if request.args.get("category"):
        sql += " AND a.category=?"
        args.append(request.args["category"])
    if request.args.get("status"):
        sql += " AND a.status=?"
        args.append(request.args["status"])
    if request.args.get("worksite_id"):
        sql += " AND a.worksite_id=?"
        args.append(int(request.args["worksite_id"]))
    sql += " ORDER BY a.archived, a.code LIMIT 2000"
    return jsonify(rows(sql, args))

@asset_bp.get("/api/my-assets")
@need(None)
def my_assets():
    return jsonify(rows("SELECT id,code,name,reg_no,serial_no FROM assets WHERE lower(operator)=lower(?) AND archived=0", (session["name"],)))

@asset_bp.get("/api/search")
@need("asset.view")
def search():
    q = (request.args.get("q") or "").strip()
    if not q: return jsonify([])
    w = " OR ".join(f"COALESCE(a.{f},'') LIKE ?" for f in SF)
    return jsonify(rows(f"SELECT a.id,a.code,a.name,a.category,a.equipment_type,a.manufacturer,a.model,a.reg_no,a.serial_no,a.operator,a.status,a.archived,w.name worksite FROM assets a LEFT JOIN worksites w ON w.id=a.worksite_id WHERE {w} ORDER BY a.archived,a.code LIMIT 100", [f"%{q}%"] * len(SF)))

@asset_bp.get("/api/assets/<int:i>/history")
@need("asset.view")
def history(i):
    if not one("SELECT 1 x FROM assets WHERE id=?", (i,)): raise Bad("Asset not found", 404)
    costs = can("expense.view")
    a, tl = timeline(i, costs)
    a["worksite"] = site(a["worksite_id"])
    docs = rows("SELECT id,kind,filename,mime,at,by FROM documents WHERE asset_id=? ORDER BY id DESC", (i,))
    out = dict(asset=a, timeline=tl, documents=docs)
    if costs:
        k = rows("SELECT kind, ROUND(SUM(amount),3) total FROM expenses WHERE asset_id=? GROUP BY kind", (i,))
        out["cost"] = dict(
            by_kind=k,
            total=round(sum(x["total"] for x in k), 3),
            by_year=rows("SELECT strftime('%Y',at) year, ROUND(SUM(amount),3) total FROM expenses WHERE asset_id=? GROUP BY year ORDER BY year", (i,))
        )
    return jsonify(out)

@asset_bp.get("/api/assets/template")
@need("asset.view")
def asset_template():
    headers = ["name","category","equipment_type","manufacturer","brand","model","year","reg_no","plate_category","vin","engine_no","serial_no","operator","civil_id_operator","department","status","purchase_date","purchase_cost","insurance_company","insurance_policy","insurance_expiry","inspection_expiry","reg_expiry","ownership_type","governorate","paci_no","warranty_details","remarks"]
    sample = ["Hyundai HD270 Tipper Truck","Dump Truck","Heavy Vehicle","Hyundai","Commercial","HD270","2022","12/48192","Commercial","KMHD270XX991823","D6AC-102938","SN-882910","Driver Jassim","289041201948","Transport","Active","2022-01-15","14500.000","Gulf Insurance Group (GIG)","POL-992123","2027-01-15","2027-02-01","2027-02-01","Company Owned","Capital","24810011","3 Years Comprehensive","Primary Kuwait quarry unit"]
    return make_csv_response("fleethub_asset_template.csv", headers, [sample])

@asset_bp.post("/api/assets/import")
@need("asset.edit")
def asset_import():
    f = request.files.get("file")
    if not f: raise Bad("Choose a CSV file to import")
    records, data_rows = parse_csv_file(f)
    imported = 0
    errors = []
    with tx() as c:
        for idx, row_dict in enumerate(records, start=2):
            if isinstance(row_dict, list): continue
            name = (row_dict.get("name") or "").strip()
            cat = (row_dict.get("category") or "").strip()
            if not name or not cat:
                errors.append(f"Row {idx}: Name and Category are required")
                continue
            reg = (row_dict.get("reg_no") or "").strip() or None
            vin = (row_dict.get("vin") or "").strip() or None
            ser = (row_dict.get("serial_no") or "").strip() or None
            if reg and c.execute("SELECT 1 FROM assets WHERE reg_no=?", (reg,)).fetchone():
                errors.append(f"Row {idx}: Registration '{reg}' already exists")
                continue
            if vin and c.execute("SELECT 1 FROM assets WHERE vin=?", (vin,)).fetchone():
                errors.append(f"Row {idx}: VIN '{vin}' already exists")
                continue
            if ser and c.execute("SELECT 1 FROM assets WHERE serial_no=?", (ser,)).fetchone():
                errors.append(f"Row {idx}: Serial '{ser}' already exists")
                continue
            d = {k: val(k, row_dict.get(k)) for k in AF}
            d["name"], d["category"] = name, cat
            d["status"] = d["status"] or "Active"
            cur = c.execute(f"INSERT INTO assets({','.join(AF)},created_at) VALUES({','.join('?' * len(AF))},?)", [d[k] for k in AF] + [now()])
            code = f"AST-{cur.lastrowid:05d}"
            c.execute("UPDATE assets SET code=? WHERE id=?", (code, cur.lastrowid))
            imported += 1
        audit("import", "assets", imported, f"{len(errors)} errors" if errors else "all ok")
    if imported > 0:
        notify_sync("asset_import", {"count": imported})
    return jsonify(imported=imported, errors=errors)

@asset_bp.post("/api/assets/<int:i>/documents")
@need("asset.edit")
def doc_up(i):
    f = request.files.get("file") or request.files.get("photo")
    if not f: raise Bad("Choose a file")
    with tx() as c:
        if not c.execute("SELECT 1 FROM assets WHERE id=?", (i,)).fetchone(): raise Bad("Asset not found", 404)
        d = save_file(c, f, asset_id=i, kind=P().get("kind") or "Document")
        audit("upload", "asset", i, f.filename)
    notify_sync("asset_document", {"asset_id": i, "doc_id": d})
    return jsonify(id=d)

@asset_bp.get("/api/files/<int:i>")
@asset_bp.get("/files/<int:i>")
@need(None)
def file_get(i):
    d = one("SELECT * FROM documents WHERE id=?", (i,))
    if not d: raise Bad("Not found", 404)
    
    # Check permissions: staff, supervisors, mechanics, drivers, or document creator
    u_role = session.get("role", "")
    u_name = session.get("name", "")
    u_user = session.get("username", "")
    is_owner = (d["by"] in (u_name, u_user))
    has_perm = (
        can("asset.view") or can("inventory.view") or can("expense.view") or
        can("complaint.review") or can("wo.view") or can("wo.update") or
        u_role in ("admin", "supervisor", "manager", "mechanic", "driver") or
        is_owner
    )
    if not has_perm:
        raise Bad("Not permitted", 403)

    fpath = os.path.join(config.UPLOAD_DIR, d["stored"])
    if not os.path.exists(fpath):
        alt_path = os.path.join(config.UPLOAD_DIR, "audio", os.path.basename(d["stored"]))
        if os.path.exists(alt_path):
            fpath = alt_path

    if not os.path.exists(fpath):
        raise Bad("Physical file not found on storage", 404)

    return send_file(
        fpath,
        mimetype=d["mime"] or "application/octet-stream",
        download_name=d["filename"],
        as_attachment=request.args.get("dl") == "1"
    )
