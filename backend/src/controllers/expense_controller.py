"""Maintenance expense ledger controller."""
from flask import Blueprint, jsonify, request, session
from ..database.connection import rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.currency_service import convert_to_kwd
from ..services.sync_service import notify_sync
from .asset_controller import save_file
from ..utils.helpers import P, now

expense_bp = Blueprint("expenses", __name__)
KINDS = ("external_labour", "outsourced_service", "towing", "external_inspection", "other_approved")

@expense_bp.post("/api/expenses")
@expense_bp.post("/expenses")
@need("expense.manage")
def exp_new():
    p = P()
    k = p.get("kind")
    amt = float(p.get("amount") or 0)
    if k == "internal_labour":
        raise Bad("Internal mechanics are paid monthly salaries. Their labour is never charged to a repair.")
    if k not in KINDS:
        raise Bad("Choose a valid expense type")
    if amt <= 0:
        raise Bad("Enter the actual amount paid")

    currency = (p.get("currency") or "KWD").strip().upper()
    manual_rate = float(p.get("exchange_rate") or 0) if p.get("exchange_rate") else None
    amt_kwd, rate_applied = convert_to_kwd(amt, currency, manual_rate)

    f = request.files.get("bill")
    if not f or not f.filename:
        raise Bad("Attach the invoice or receipt for this payment")

    with tx() as c:
        wid = int(p["wo_id"]) if p.get("wo_id") else None
        if wid:
            aid = (c.execute("SELECT asset_id FROM work_orders WHERE id=?", (wid,)).fetchone() or [None])[0]
        else:
            aid = int(p.get("asset_id") or 0)
        if not aid or not c.execute("SELECT 1 FROM assets WHERE id=?", (aid,)).fetchone():
            raise Bad("Choose a registered asset or work order")

        is_d_row = c.execute("SELECT is_demo FROM assets WHERE id=?", (aid,)).fetchone()
        is_demo_val = 1 if (is_d_row and is_d_row[0]) else 0

        cur = c.execute("""INSERT INTO expenses(asset_id,wo_id,kind,amount,ref,note,by,at,currency,original_amount,exchange_rate,is_demo)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (aid, wid, k, amt_kwd, p.get("ref"), p.get("note"), session["name"], now(), currency, amt if currency != "KWD" else None, rate_applied, is_demo_val))
        save_file(c, f, asset_id=aid, wo_id=wid, expense_id=cur.lastrowid, kind="Expense bill")
        audit("create", "expense", cur.lastrowid, f"{k} {amt_kwd} KWD ({amt} {currency})")

    notify_sync("expense_create", {"expense_id": cur.lastrowid})
    return jsonify(ok=1)

@expense_bp.get("/api/expenses")
@expense_bp.get("/expenses")
@need("expense.view")
def exp_list():
    return jsonify(rows("SELECT e.*, a.code asset_code, a.name asset_name, (SELECT id FROM documents d WHERE d.expense_id=e.id LIMIT 1) bill_id FROM expenses e JOIN assets a ON a.id=e.asset_id ORDER BY e.id DESC LIMIT 500"))
