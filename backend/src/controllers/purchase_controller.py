"""External purchases, procurement, and document management controller."""
import os
from flask import Blueprint, jsonify, request, session
from ..database.connection import one, rows, tx, audit, notify
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, can
from ..services.currency_service import convert_to_kwd
from ..services.sync_service import notify_sync
from .asset_controller import save_file
from .inventory_controller import stock_move
from ..utils.helpers import P, now
from ..config import config

purchase_bp = Blueprint("purchases", __name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_DOC_KINDS = {
    "External Purchase Bill",
    "Supplier Invoice",
    "Purchase Receipt",
    "Supporting Document",
    "Purchase bill"
}

def validate_purchase_file(file_obj):
    """Validate file presence, extension, and content size."""
    if not file_obj or not file_obj.filename:
        raise Bad("Please select a document or invoice file to upload", 400)
    ext = os.path.splitext(file_obj.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise Bad(f"Unsupported file format '{ext}'. Allowed formats: PDF, JPG, JPEG, PNG, WEBP.", 400)
    return ext

@purchase_bp.post("/api/purchases")
@need("purchase.create")
def pur_new():
    p = P()
    q = float(p.get("qty") or 0)
    name = (p.get("part_name") or "").strip()
    to_stock = 1 if str(p.get("to_stock")) in ("1", "true", "yes") else 0
    wid = int(p["wo_id"]) if p.get("wo_id") else None
    pid = int(p["part_id"]) if p.get("part_id") else None
    aid = int(p["asset_id"]) if p.get("asset_id") else None
    sup_id = int(p["supplier_id"]) if p.get("supplier_id") else None
    sup_name = (p.get("supplier") or "").strip()

    if not name or q <= 0: raise Bad("Part name and a quantity above zero are required")
    currency = (p.get("currency") or "KWD").strip().upper()
    est_price = float(p.get("est_price") or 0)
    manual_rate = float(p.get("exchange_rate") or 0) if p.get("exchange_rate") else None
    est_kwd, rate_applied = convert_to_kwd(est_price, currency, manual_rate)

    with tx() as c:
        if wid:
            w = c.execute("SELECT * FROM work_orders WHERE id=?", (wid,)).fetchone()
            if not w: raise Bad("Work order not found", 404)
            aid = w["asset_id"]
        if to_stock and not pid:
            raise Bad("Choose the catalogue part that will be restocked (add it to the catalogue first)")
        if not to_stock and not aid:
            raise Bad("Link the purchase to a work order or an asset")
        if pid:
            pt = c.execute("SELECT * FROM parts WHERE id=?", (pid,)).fetchone()
            if not pt: raise Bad("Catalogue part not found", 404)
            if not to_stock and pt["qty"] >= q:
                raise Bad(f"{pt['qty']:g} {pt['stock_id']} already in stock. Raise a stock requisition instead of buying externally.", 409)
        if sup_id and not sup_name:
            s_row = c.execute("SELECT name FROM suppliers WHERE id=?", (sup_id,)).fetchone()
            if s_row: sup_name = s_row["name"]
        elif not sup_id and sup_name:
            s_row = c.execute("SELECT id FROM suppliers WHERE LOWER(name)=LOWER(?)", (sup_name,)).fetchone()
            if s_row: sup_id = s_row["id"]
        is_d = 0
        if aid:
            r = c.execute("SELECT is_demo FROM assets WHERE id=?", (aid,)).fetchone()
            if r and r[0]: is_d = 1
        elif pid:
            r = c.execute("SELECT is_demo FROM parts WHERE id=?", (pid,)).fetchone()
            if r and r[0]: is_d = 1
        cur = c.execute(
            "INSERT INTO purchases(asset_id,wo_id,part_id,part_name,qty,est_price,supplier,supplier_id,to_stock,requested_by,created_at,currency,original_price,exchange_rate,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (aid, wid, pid, name, q, est_kwd or None, sup_name or None, sup_id, to_stock, session["name"], now(), currency, est_price if currency != "KWD" else None, rate_applied, is_d)
        )
        code = f"PUR-{cur.lastrowid:05d}"
        c.execute("UPDATE purchases SET code=? WHERE id=?", (code, cur.lastrowid))
        audit("request", "purchase", code, name)
        notify("management", f"Purchase requested {code}", f"{q:g} x {name} from {sup_name or 'TBC'} ({est_kwd:g} KWD)", kind="purchase", link="#pur")
    notify_sync("purchase_create", {"purchase_id": cur.lastrowid, "code": code})
    return jsonify(id=cur.lastrowid, code=code)

@purchase_bp.get("/api/purchases")
@need(None)
def pur_list():
    if not (can("purchase.create") or can("purchase.approve") or can("purchase.record")):
        raise Bad("Not permitted", 403)
    return jsonify(rows("""
        SELECT p.*, a.code asset_code, a.name asset_name, w.code wo_code, s.name supplier_name,
               (SELECT id FROM documents d WHERE d.purchase_id=p.id ORDER BY d.id DESC LIMIT 1) bill_id,
               (SELECT COUNT(*) FROM documents d WHERE d.purchase_id=p.id) doc_count
        FROM purchases p
        LEFT JOIN assets a ON a.id=p.asset_id
        LEFT JOIN work_orders w ON w.id=p.wo_id
        LEFT JOIN suppliers s ON s.id=p.supplier_id
        ORDER BY p.id DESC LIMIT 500
    """))

@purchase_bp.post("/api/purchases/<int:i>/decide")
@need("purchase.approve")
def pur_decide(i):
    d = P().get("decision")
    if d not in ("approve", "reject"): raise Bad("Unknown decision")
    with tx() as c:
        r = c.execute("SELECT * FROM purchases WHERE id=?", (i,)).fetchone()
        if not r: raise Bad("Not found", 404)
        if r["status"] != "Requested": raise Bad("This request has already been decided")
        st = "Approved" if d == "approve" else "Rejected"
        c.execute("UPDATE purchases SET status=?, decided_by=? WHERE id=?", (st, session["name"], i))
        audit(d, "purchase", r["code"])
        notify("procurement", f"Purchase {r['code']} {st}", f"Decided by {session['name']}", kind="purchase", link="#pur")
    notify_sync("purchase_decide", {"purchase_id": i, "status": st})
    return jsonify(ok=1)

@purchase_bp.post("/api/purchases/<int:i>/record")
@need("purchase.record")
def pur_record(i):
    p = P()
    up = float(p.get("unit_price") or 0)
    f = request.files.get("bill")
    if up <= 0: raise Bad("Enter the actual unit price paid")
    if not f or not f.filename: raise Bad("Upload the original bill, invoice, or receipt (PDF, JPG, PNG, WEBP)")
    validate_purchase_file(f)

    currency = (p.get("currency") or "KWD").strip().upper()
    manual_rate = float(p.get("exchange_rate") or 0) if p.get("exchange_rate") else None
    up_kwd, rate_applied = convert_to_kwd(up, currency, manual_rate)
    sup_name = (p.get("supplier") or "").strip() or None
    doc_kind = (p.get("doc_kind") or "External Purchase Bill").strip()
    if doc_kind not in ALLOWED_DOC_KINDS:
        doc_kind = "External Purchase Bill"

    with tx() as c:
        r = c.execute("SELECT * FROM purchases WHERE id=?", (i,)).fetchone()
        if not r: raise Bad("Not found", 404)
        if r["status"] != "Approved": raise Bad("Only approved requests can be recorded")
        doc_id = save_file(c, f, asset_id=r["asset_id"], wo_id=r["wo_id"], purchase_id=i, kind=doc_kind)
        c.execute("""UPDATE purchases SET status='Purchased', unit_price=?, invoice_no=?, supplier=COALESCE(?,supplier), purchased_at=?, currency=?, original_price=?, exchange_rate=?
                     WHERE id=?""",
                  (up_kwd, p.get("invoice_no"), sup_name, now(), currency, up if currency != "KWD" else None, rate_applied, i))
        if r["to_stock"]:
            stock_move(c, r["part_id"], "in", r["qty"], cost=up_kwd, note=r["code"])
        else:
            c.execute("""INSERT INTO expenses(asset_id,wo_id,kind,amount,ref,note,by,at,currency,original_amount,exchange_rate)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                      (r["asset_id"], r["wo_id"], "external_purchase", round(r["qty"] * up_kwd, 3), f"pur:{i}", f"{r['code']}: {r['qty']:g} x {r['part_name']}, invoice {p.get('invoice_no') or '-'}", session["name"], now(), currency, round(r["qty"] * up, 3) if currency != "KWD" else None, rate_applied))
        audit("record", "purchase", r["code"], f"unit {up_kwd} KWD ({up} {currency})")
    notify_sync("purchase_record", {"purchase_id": i})
    return jsonify(ok=1, doc_id=doc_id)

@purchase_bp.get("/api/purchases/<int:i>/documents")
@need(None)
def pur_docs_list(i):
    """Retrieve all supporting documents and invoices attached to a purchase."""
    if not (can("purchase.create") or can("purchase.approve") or can("purchase.record")):
        raise Bad("Not permitted", 403)
    docs = rows("""
        SELECT id, kind, filename, mime, by, at
        FROM documents
        WHERE purchase_id = ?
        ORDER BY id DESC
    """, (i,))
    return jsonify(docs)

@purchase_bp.post("/api/purchases/<int:i>/documents")
@need("purchase.record")
def pur_doc_upload(i):
    """Upload a bill, invoice, receipt, or supporting document to a purchase."""
    f = request.files.get("file") or request.files.get("document")
    validate_purchase_file(f)
    kind = (request.form.get("kind") or "Supporting Document").strip()
    if kind not in ALLOWED_DOC_KINDS:
        kind = "Supporting Document"

    with tx() as c:
        p = c.execute("SELECT * FROM purchases WHERE id=?", (i,)).fetchone()
        if not p: raise Bad("Purchase record not found", 404)
        doc_id = save_file(c, f, asset_id=p["asset_id"], wo_id=p["wo_id"], purchase_id=i, kind=kind)
        audit("upload", "purchase", p["code"], f"{kind}: {f.filename}")
    notify_sync("purchase_document", {"purchase_id": i, "doc_id": doc_id})
    return jsonify(ok=True, doc_id=doc_id, message="Document uploaded successfully.")

@purchase_bp.delete("/api/purchases/<int:i>/documents/<int:doc_id>")
@need("purchase.record")
def pur_doc_delete(i, doc_id):
    """Delete an uploaded document from a purchase."""
    with tx() as c:
        doc = c.execute("SELECT * FROM documents WHERE id=? AND purchase_id=?", (doc_id, i)).fetchone()
        if not doc: raise Bad("Document not found", 404)
        fpath = os.path.join(config.UPLOAD_DIR, doc["stored"])
        if os.path.exists(fpath):
            try: os.remove(fpath)
            except Exception: pass
        c.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        audit("delete", "purchase_doc", i, f"Deleted document {doc['filename']}")
    notify_sync("purchase_document_delete", {"purchase_id": i, "doc_id": doc_id})
    return jsonify(ok=True, message="Document removed.")
