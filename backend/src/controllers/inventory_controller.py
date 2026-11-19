"""Spare parts and inventory stock management controller."""
import secrets
from flask import Blueprint, jsonify, request, session
from ..database.connection import one, rows, tx, audit, notify
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.sync_service import notify_sync
from ..utils.helpers import P, now

inventory_bp = Blueprint("inventory", __name__)

def stock_move(c, pid, kind, qty, cost=None, **kw):
    pt = c.execute("SELECT * FROM parts WHERE id=?", (pid,)).fetchone()
    if not pt: raise Bad("Part not found", 404)
    prev = pt["qty"]
    new = qty if kind == "adjust" else prev + (qty if kind in ("in", "return") else -qty)
    if new < 0: raise Bad(f"Only {prev:g} in stock", 409)
    avg = pt["unit_cost"]
    if kind == "in" and cost is not None and prev + qty > 0:
        avg = round((prev * pt["unit_cost"] + qty * cost) / (prev + qty), 4)
    c.execute("UPDATE parts SET qty=?, unit_cost=? WHERE id=?", (new, avg, pid))
    is_d = pt["is_demo"] if "is_demo" in pt.keys() else 0
    if not is_d and kw.get("asset_id"):
        r = c.execute("SELECT is_demo FROM assets WHERE id=?", (kw["asset_id"],)).fetchone()
        if r and r[0]: is_d = 1
    elif not is_d and kw.get("wo_id"):
        r = c.execute("SELECT is_demo FROM work_orders WHERE id=?", (kw["wo_id"],)).fetchone()
        if r and r[0]: is_d = 1
    cur = c.execute(
        "INSERT INTO stock_tx(part_id,kind,qty,prev_qty,new_qty,asset_id,wo_id,unit_cost,by,note,is_demo,at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        (pid, kind, qty, prev, new, kw.get("asset_id"), kw.get("wo_id"), cost if (kind == "in" and cost is not None) else pt["unit_cost"], session.get("name") or "system", kw.get("note"), is_d, now())
    )
    if pt["min_qty"] > 0 and new <= pt["min_qty"]:
        notify("inventory", f"Low stock alert: {pt['stock_id']}", f"{pt['name']} is down to {new:g} (min: {pt['min_qty']:g})", kind="low_stock", link="#parts")
    return cur.lastrowid, pt

@inventory_bp.get("/api/parts")
@inventory_bp.get("/parts")
@need("inventory.view")
def parts():
    q = (request.args.get("q") or "").strip()
    w = " OR ".join(f"p.{f} LIKE ?" for f in ("stock_id", "name", "oem_no", "manufacturer", "compat"))
    sql = "SELECT p.*, s.name supplier_name FROM parts p LEFT JOIN suppliers s ON s.id=p.supplier_id"
    if q: sql += " WHERE " + w
    sql += " ORDER BY p.stock_id LIMIT 1000"
    return jsonify(rows(sql, [f"%{q}%"] * 5 if q else []))

@inventory_bp.post("/api/parts")
@inventory_bp.post("/parts")
@need("inventory.manage")
def part_new():
    p = P()
    name = (p.get("name") or "").strip()
    sid = (p.get("stock_id") or "").strip().upper() or None
    if not name: raise Bad("Part name is required")
    sup_id = int(p["supplier_id"]) if p.get("supplier_id") else None
    with tx() as c:
        if sid and c.execute("SELECT 1 FROM parts WHERE stock_id=?", (sid,)).fetchone():
            raise Bad("This Stock ID already exists", 409)
        cur = c.execute(
            "INSERT INTO parts(stock_id,name,category,manufacturer,oem_no,compat,unit,min_qty,unit_cost,location,supplier_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (sid or "TMP" + secrets.token_hex(4), name, p.get("category"), p.get("manufacturer"), p.get("oem_no"), p.get("compat"), p.get("unit") or "pcs", float(p.get("min_qty") or 0), float(p.get("unit_cost") or 0), p.get("location"), sup_id)
        )
        sid = sid or f"STK-{cur.lastrowid:05d}"
        c.execute("UPDATE parts SET stock_id=? WHERE id=?", (sid, cur.lastrowid))
        audit("create", "part", sid, name)
    notify_sync("part_create", {"part_id": cur.lastrowid, "stock_id": sid})
    return jsonify(stock_id=sid, id=cur.lastrowid)

@inventory_bp.post("/api/parts/<int:pid>/stock")
@inventory_bp.post("/parts/<int:pid>/stock")
@need("inventory.manage")
def part_stock(pid):
    p = P()
    k = p.get("kind")
    q = float(p.get("qty") or 0)
    if k not in ("in", "adjust") or q < 0 or (k == "in" and q <= 0):
        raise Bad("Enter a valid quantity")
    with tx() as c:
        stock_move(c, pid, k, q, cost=float(p["unit_cost"]) if p.get("unit_cost") else None, note=p.get("note"))
        audit("stock " + k, "part", pid, str(q))
    notify_sync("part_stock", {"part_id": pid, "kind": k, "qty": q})
    return jsonify(ok=1)

@inventory_bp.post("/api/parts/<int:pid>/issue")
@inventory_bp.post("/parts/<int:pid>/issue")
@need("inventory.issue")
def part_issue(pid):
    p = P()
    q = float(p.get("qty") or 0)
    if q <= 0: raise Bad("Enter a quantity above zero")
    with tx() as c:
        w = c.execute("SELECT * FROM work_orders WHERE id=?", (int(p.get("wo_id") or 0),)).fetchone()
        if not w: raise Bad("Choose a work order")
        if w["status"] in ("Released", "Rejected", "Cancelled"):
            raise Bad("This work order is closed")
        tid, pt = stock_move(c, pid, "out", q, asset_id=w["asset_id"], wo_id=w["id"], note=p.get("note"))
        c.execute(
            "INSERT INTO expenses(asset_id,wo_id,kind,amount,ref,note,by,at) VALUES(?,?,?,?,?,?,?,?)",
            (w["asset_id"], w["id"], "spare_part", round(q * pt["unit_cost"], 3), f"tx:{tid}", f"{q:g} x {pt['name']} ({pt['stock_id']})", session["name"], now())
        )
        audit("issue", "part", pt["stock_id"], f"{q:g} to {w['code']}")
    notify_sync("part_issue", {"part_id": pid, "wo_id": w["id"]})
    return jsonify(ok=1)

@inventory_bp.post("/api/parts/<int:pid>/return")
@inventory_bp.post("/parts/<int:pid>/return")
@need("inventory.issue")
def part_return(pid):
    p = P()
    q = float(p.get("qty") or 0)
    with tx() as c:
        w = c.execute("SELECT * FROM work_orders WHERE id=?", (int(p.get("wo_id") or 0),)).fetchone()
        if not w or q <= 0: raise Bad("Choose a work order and a quantity above zero")
        s = lambda k: c.execute("SELECT COALESCE(SUM(qty),0) FROM stock_tx WHERE part_id=? AND wo_id=? AND kind=?", (pid, w["id"], k)).fetchone()[0]
        if q > s("out") - s("return"):
            raise Bad("You cannot return more than was issued to this work order")
        uc = c.execute("SELECT unit_cost FROM stock_tx WHERE part_id=? AND wo_id=? AND kind='out' ORDER BY id DESC LIMIT 1", (pid, w["id"])).fetchone()[0] or 0
        tid, pt = stock_move(c, pid, "return", q, asset_id=w["asset_id"], wo_id=w["id"], note=p.get("note"))
        c.execute(
            "INSERT INTO expenses(asset_id,wo_id,kind,amount,ref,note,by,at) VALUES(?,?,?,?,?,?,?,?)",
            (w["asset_id"], w["id"], "spare_part", -round(q * uc, 3), f"tx:{tid}", f"Returned {q:g} x {pt['name']}", session["name"], now())
        )
        audit("return", "part", pt["stock_id"], f"{q:g} from {w['code']}")
    notify_sync("part_return", {"part_id": pid, "wo_id": w["id"]})
    return jsonify(ok=1)

@inventory_bp.get("/api/parts/<int:pid>/history")
@inventory_bp.get("/parts/<int:pid>/history")
@need("inventory.view")
def part_hist(pid):
    return jsonify(rows("SELECT t.*, a.code asset_code, w.code wo_code FROM stock_tx t LEFT JOIN assets a ON a.id=t.asset_id LEFT JOIN work_orders w ON w.id=t.wo_id WHERE t.part_id=? ORDER BY t.id DESC", (pid,)))
