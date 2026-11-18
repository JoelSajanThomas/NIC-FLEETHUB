"""Real-time synchronization service for NIC FleetHub.
Provides atomic version tracking, SSE streaming, and public operational statistics.
"""
import time, threading, queue, json
from datetime import datetime
from flask import Response

DB_SYNC_VERSION = int(time.time() * 1000)
SYNC_CLIENTS = []
SYNC_CLIENTS_LOCK = threading.Lock()

def get_sync_version():
    """Return the current sync version token."""
    global DB_SYNC_VERSION
    return DB_SYNC_VERSION

def notify_sync(event_type="update", details=None):
    """Broadcast a database update event to all active SSE subscribers."""
    global DB_SYNC_VERSION
    with SYNC_CLIENTS_LOCK:
        DB_SYNC_VERSION = int(time.time() * 1000)
        dead = []
        payload = json.dumps({"version": DB_SYNC_VERSION, "type": event_type, "details": details or {}})
        for q in SYNC_CLIENTS:
            try:
                q.put_nowait(payload)
            except Exception:
                dead.append(q)
        for d in dead:
            if d in SYNC_CLIENTS:
                SYNC_CLIENTS.remove(d)

def create_sse_stream():
    """Create a lightweight non-blocking SSE response that sends current state and terminates immediately."""
    def event_stream():
        yield f"data: {json.dumps({'version': DB_SYNC_VERSION, 'type': 'connect'})}\n\n"
    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "close",
            "X-Accel-Buffering": "no"
        }
    )

def compute_public_stats(db_conn):
    """Calculate public-safe aggregated operational statistics directly from SQLite."""
    cur = db_conn.cursor()
    
    # 1. Fleet aggregates
    cur.execute("SELECT count(*) FROM assets WHERE archived = 0")
    total_assets = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM assets WHERE archived = 0 AND status = 'Active'")
    active_assets = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM assets WHERE archived = 0 AND status = 'Under Repair'")
    under_repair = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM assets WHERE archived = 0 AND status = 'Out of Service'")
    out_of_service = cur.fetchone()[0] or 0

    avail_rate = round((active_assets / total_assets * 100), 1) if total_assets > 0 else 0.0

    cur.execute("""
        SELECT a.id, a.code, a.name, a.category, a.status, COALESCE(w.name, 'Kuwait Yard') as site_name
        FROM assets a
        LEFT JOIN worksites w ON a.worksite_id = w.id
        WHERE a.archived = 0
        ORDER BY a.id DESC LIMIT 5
    """)
    fleet_list = [
        {"id": r[0], "code": r[1], "name": r[2], "category": r[3], "status": r[4], "worksite": r[5]}
        for r in cur.fetchall()
    ]

    # 2. Operations aggregates
    cur.execute("SELECT count(*) FROM work_orders WHERE status NOT IN ('Completed', 'Released', 'Rejected')")
    open_wo = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM work_orders WHERE status IN ('Completed', 'Released')")
    completed_wo = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM complaints WHERE status = 'New'")
    pending_complaints = cur.fetchone()[0] or 0

    # Stages
    stages = {"Reported": 0, "Approved": 0, "Assigned": 0, "In progress": 0, "Waiting for parts": 0}
    cur.execute("SELECT count(*) FROM complaints WHERE status = 'New'")
    stages["Reported"] = cur.fetchone()[0] or 0
    cur.execute("SELECT count(*) FROM complaints WHERE status = 'Approved'")
    stages["Approved"] = cur.fetchone()[0] or 0
    cur.execute("SELECT count(*) FROM work_orders WHERE status IN ('Pending', 'Assigned', 'Awaiting Approval')")
    stages["Assigned"] = cur.fetchone()[0] or 0
    cur.execute("SELECT count(*) FROM work_orders WHERE LOWER(status) = 'in progress'")
    stages["In progress"] = cur.fetchone()[0] or 0
    cur.execute("""
        SELECT (SELECT count(*) FROM work_orders WHERE status LIKE 'Waiting%' OR status = 'Parts sourcing') +
               (SELECT count(*) FROM purchases WHERE status = 'Requested')
    """)
    stages["Waiting for parts"] = cur.fetchone()[0] or 0

    # Priority Work Orders
    cur.execute("""
        SELECT w.id, w.code, a.code as asset_code, a.name as asset_name, w.description, w.priority, w.status
        FROM work_orders w
        JOIN assets a ON w.asset_id = a.id
        WHERE w.status NOT IN ('Completed', 'Released', 'Rejected', 'Cancelled')
        ORDER BY CASE w.priority WHEN 'Critical' THEN 1 WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END, w.id DESC
        LIMIT 4
    """)
    priority_wo = [
        {"id": r[0], "code": r[1], "asset_code": r[2], "asset_name": r[3], "desc": r[4], "priority": r[5], "status": r[6]}
        for r in cur.fetchall()
    ]

    # 3. Inventory
    cur.execute("SELECT count(*) FROM parts")
    total_parts = cur.fetchone()[0] or 0

    cur.execute("SELECT count(*) FROM parts WHERE qty <= min_qty")
    low_stock_count = cur.fetchone()[0] or 0

    cur.execute("SELECT stock_id, name, qty, min_qty, unit FROM parts ORDER BY qty ASC LIMIT 4")
    inventory_items = [
        {"stock_id": r[0], "name": r[1], "qty": float(r[2] or 0), "min_qty": float(r[3] or 0), "unit": r[4], "is_low": float(r[2] or 0) <= float(r[3] or 0)}
        for r in cur.fetchall()
    ]

    # 4. Kuwait Worksites
    cur.execute("SELECT count(*) FROM worksites WHERE active = 1")
    total_sites = cur.fetchone()[0] or 0

    # 5. Transfers
    cur.execute("""
        SELECT t.id, a.code, a.name, t.from_site, t.to_site
        FROM transfers t
        JOIN assets a ON t.asset_id = a.id
        ORDER BY t.id DESC LIMIT 1
    """)
    transfer_row = cur.fetchone()
    recent_transfer = {
        "id": transfer_row[0], "asset_code": transfer_row[1], "asset_name": transfer_row[2],
        "from_site": transfer_row[3], "to_site": transfer_row[4]
    } if transfer_row else None

    # 6. Expiries countdown (Fahs Fanni, Traffic Daftar, Insurance)
    cur.execute("""
        SELECT id, code, name, category, inspection_expiry, reg_expiry, insurance_expiry
        FROM assets
        WHERE archived = 0 AND (inspection_expiry IS NOT NULL OR reg_expiry IS NOT NULL OR insurance_expiry IS NOT NULL)
        LIMIT 10
    """)
    expiries = []
    today = datetime.now().date()
    for row in cur.fetchall():
        aid, code, name, cat, fahs_exp, reg_exp, ins_exp = row
        if ins_exp:
            try:
                d = datetime.strptime(ins_exp, "%Y-%m-%d").date()
                diff = (d - today).days
                expiries.append({"type": "insurance", "days": max(0, diff), "label": f"Gulf Insurance Group (GIG), {code} ({cat})"})
            except Exception: pass
        if fahs_exp:
            try:
                d = datetime.strptime(fahs_exp, "%Y-%m-%d").date()
                diff = (d - today).days
                expiries.append({"type": "fahs", "days": max(0, diff), "label": f"Fahs Fanni (الفحص الفني), {code} ({cat})"})
            except Exception: pass
        if reg_exp:
            try:
                d = datetime.strptime(reg_exp, "%Y-%m-%d").date()
                diff = (d - today).days
                expiries.append({"type": "daftar", "days": max(0, diff), "label": f"Traffic Daftar, {code} ({cat})"})
            except Exception: pass

    expiries.sort(key=lambda x: x["days"])

    # 7. Featured Asset profile
    cur.execute("""
        SELECT id, code, name, reg_no, paci_no, status
        FROM assets
        WHERE archived = 0
        ORDER BY id DESC LIMIT 1
    """)
    featured_row = cur.fetchone()
    featured_asset = None
    if featured_row:
        fa_id, fa_code, fa_name, fa_reg, fa_paci, fa_status = featured_row
        cur.execute("SELECT count(*) FROM work_orders WHERE asset_id = ?", (fa_id,))
        fa_wo = cur.fetchone()[0] or 0
        cur.execute("SELECT count(*) FROM stock_tx WHERE asset_id = ?", (fa_id,))
        fa_parts = cur.fetchone()[0] or 0
        featured_asset = {
            "code": fa_code, "name": fa_name, "reg_no": fa_reg or "KUW-NIC-01",
            "paci_no": fa_paci or "29801144", "status": fa_status,
            "wo_count": fa_wo, "parts_count": fa_parts
        }

    # 8. Financial summary (total maintenance in KWD)
    cur.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses")
    total_maint_kwd = cur.fetchone()[0] or 0.0

    return {
        "version": DB_SYNC_VERSION,
        "fleet": {
            "total": total_assets,
            "active": active_assets,
            "under_repair": under_repair,
            "out_of_service": out_of_service,
            "availability_rate": avail_rate,
            "list": fleet_list
        },
        "operations": {
            "open_work_orders": open_wo,
            "completed_work_orders": completed_wo,
            "pending_complaints": pending_complaints,
            "stages": stages,
            "priority_work_orders": priority_wo
        },
        "inventory": {
            "total_parts": total_parts,
            "low_stock_count": low_stock_count,
            "items": inventory_items
        },
        "sites": {
            "total_sites": total_sites
        },
        "transfer": recent_transfer,
        "expiries": expiries[:4],
        "featured_asset": featured_asset,
        "total_maintenance_kwd": total_maint_kwd
    }
