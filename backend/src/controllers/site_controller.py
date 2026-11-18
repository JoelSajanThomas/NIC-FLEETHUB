"""Worksites and operational categories controller."""
from flask import Blueprint, jsonify
from ..database.connection import one, rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..utils.helpers import P

site_bp = Blueprint("sites", __name__)

@site_bp.get("/api/categories")
@need(None)
def cat_list():
    return jsonify(rows("SELECT id, kind, name FROM categories ORDER BY kind, name"))

@site_bp.post("/api/categories")
@need("settings")
def cat_new():
    p = P()
    k = (p.get("kind") or "").strip().lower()
    n = (p.get("name") or "").strip()
    if k not in ("asset", "part") or not n:
        raise Bad("Valid kind ('asset' or 'part') and category name are required")
    with tx() as cur:
        cur.execute("INSERT INTO categories(kind, name) VALUES(?,?)", (k, n))
        cid = cur.lastrowid
        audit("create", "category", cid, f"{k}:{n}")
    return jsonify(id=cid, kind=k, name=n)

@site_bp.post("/api/worksites")
@need("settings")
def ws_new():
    p = P()
    n = (p.get("name") or "").strip()
    st = (p.get("site_type") or "Project Site").strip()
    gov = (p.get("governorate") or "Capital").strip()
    paci = (p.get("paci_no") or "").strip()
    cp = (p.get("contact_person") or "").strip()
    cphone = (p.get("contact_phone") or "").strip()
    if not n:
        raise Bad("Worksite name is required")
    with tx() as cur:
        cur.execute("""INSERT INTO worksites(name, site_type, governorate, paci_no, contact_person, contact_phone, active)
                       VALUES(?,?,?,?,?,?,1)""",
                    (n, st, gov, paci, cp, cphone))
        wid = cur.lastrowid
        audit("create", "worksite", wid, f"{n} ({gov})")
    return jsonify(id=wid, name=n, site_type=st, governorate=gov, paci_no=paci, contact_person=cp, contact_phone=cphone, active=1)

@site_bp.get("/api/worksites")
@need(None)
def ws_list():
    return jsonify(rows("SELECT id, name, site_type, governorate, paci_no, contact_person, contact_phone, active FROM worksites WHERE active=1 ORDER BY name"))

@site_bp.get("/api/worksites/<int:i>")
@need(None)
def ws_get(i):
    r = one("SELECT id, name, site_type, governorate, paci_no, contact_person, contact_phone, active FROM worksites WHERE id=?", (i,))
    if not r:
        raise Bad("Worksite not found", 404)
    return jsonify(r)

@site_bp.put("/api/worksites/<int:i>")
@need("settings")
def ws_edit(i):
    p = P()
    n = (p.get("name") or "").strip()
    st = (p.get("site_type") or "Project Site").strip()
    gov = (p.get("governorate") or "Capital").strip()
    paci = (p.get("paci_no") or "").strip()
    cp = (p.get("contact_person") or "").strip()
    cphone = (p.get("contact_phone") or "").strip()
    if not n:
        raise Bad("Worksite name is required")
    with tx() as cur:
        cur.execute("""UPDATE worksites SET name=?, site_type=?, governorate=?, paci_no=?, contact_person=?, contact_phone=?
                       WHERE id=?""",
                    (n, st, gov, paci, cp, cphone, i))
        audit("edit", "worksite", i, f"{n} ({gov})")
    return jsonify(ok=1)
