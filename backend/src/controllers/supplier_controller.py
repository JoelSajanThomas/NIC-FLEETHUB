"""Suppliers management controller."""
from flask import Blueprint, jsonify
from ..database.connection import one, rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..utils.helpers import P, now

supplier_bp = Blueprint("suppliers", __name__)

@supplier_bp.get("/api/suppliers")
@need("supplier.view")
def sup_list():
    return jsonify(rows("SELECT * FROM suppliers ORDER BY active DESC, name ASC"))

@supplier_bp.post("/api/suppliers")
@need("supplier.manage")
def sup_new():
    p = P()
    n = (p.get("name") or "").strip()
    if not n:
        raise Bad("Supplier name is required")
    cp = (p.get("contact_person") or "").strip()
    ph = (p.get("phone") or "").strip()
    em = (p.get("email") or "").strip()
    ad = (p.get("address") or "").strip()
    tx_no = (p.get("tax_no") or "").strip()
    cats = (p.get("categories") or "").strip()
    notes = (p.get("notes") or "").strip()
    with tx() as cur:
        cur.execute("SELECT MAX(id) FROM suppliers")
        max_id = (cur.fetchone()[0] or 0) + 1
        code = f"SUP-{max_id:04d}"
        cur.execute("""INSERT INTO suppliers(code, name, contact_person, phone, email, address, tax_no, categories, notes, active, created_at)
                       VALUES(?,?,?,?,?,?,?,?,?,1,?)""",
                    (code, n, cp, ph, em, ad, tx_no, cats, notes, now()))
        sid = cur.lastrowid
        audit("create", "supplier", sid, f"{code} {n}")
    return jsonify(id=sid, code=code, name=n)

@supplier_bp.get("/api/suppliers/<int:i>")
@need("supplier.view")
def sup_get(i):
    r = one("SELECT * FROM suppliers WHERE id=?", (i,))
    if not r:
        raise Bad("Supplier not found", 404)
    return jsonify(r)

@supplier_bp.put("/api/suppliers/<int:i>")
@need("supplier.manage")
def sup_edit(i):
    p = P()
    n = (p.get("name") or "").strip()
    if not n:
        raise Bad("Supplier name is required")
    cp = (p.get("contact_person") or "").strip()
    ph = (p.get("phone") or "").strip()
    em = (p.get("email") or "").strip()
    ad = (p.get("address") or "").strip()
    tx_no = (p.get("tax_no") or "").strip()
    cats = (p.get("categories") or "").strip()
    notes = (p.get("notes") or "").strip()
    with tx() as cur:
        cur.execute("""UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=?, tax_no=?, categories=?, notes=?
                       WHERE id=?""",
                    (n, cp, ph, em, ad, tx_no, cats, notes, i))
        audit("edit", "supplier", i, n)
    return jsonify(ok=1)

@supplier_bp.post("/api/suppliers/<int:i>/toggle")
@need("supplier.manage")
def sup_toggle(i):
    s = one("SELECT active FROM suppliers WHERE id=?", (i,))
    if not s:
        raise Bad("Supplier not found", 404)
    new_state = 0 if s["active"] else 1
    with tx() as cur:
        cur.execute("UPDATE suppliers SET active=? WHERE id=?", (new_state, i))
        audit("toggle", "supplier", i, f"active={new_state}")
    return jsonify(ok=1, active=new_state)
