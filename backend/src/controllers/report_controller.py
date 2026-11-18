"""Reports, dashboard KPIs, alerts, notifications, audit log, and backup controller."""
import os, sqlite3
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, session
from ..config import config
from ..database.connection import get_db, rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, can
from ..services.sync_service import notify_sync
from ..utils.helpers import make_csv_response

report_bp = Blueprint("reports", __name__)

@report_bp.get("/api/reports/export")
@need("report.view")
def reports_export():
    rtype = request.args.get("type", "assets")
    fmt = request.args.get("format", "json")
    headers, data_rows = [], []

    if rtype == "assets":
        headers = ["Asset ID", "Name", "Category", "Equipment Type", "Manufacturer", "Brand", "Model", "Year", "Kuwait Plate", "Plate Category", "VIN / Chassis", "Engine No", "Serial No", "Operator", "Civil ID", "Department", "Worksite", "Governorate", "PACI No", "Status", "Purchase Date", "Purchase Cost (KWD)", "Insurance Company", "Insurance Policy", "Insurance Expiry", "Inspection Expiry", "Reg Expiry"]
        res = rows("SELECT a.code, a.name, a.category, a.equipment_type, a.manufacturer, a.brand, a.model, a.year, a.reg_no, a.plate_category, a.vin, a.engine_no, a.serial_no, a.operator, a.civil_id_operator, a.department, w.name worksite, a.governorate, a.paci_no, a.status, a.purchase_date, a.purchase_cost, a.insurance_company, a.insurance_policy, a.insurance_expiry, a.inspection_expiry, a.reg_expiry FROM assets a LEFT JOIN worksites w ON w.id=a.worksite_id WHERE a.archived=0 ORDER BY a.code")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "complaints":
        headers = ["Complaint ID", "Asset ID", "Asset Name", "Driver", "Location", "Category", "Priority", "Description", "Status", "Decided By", "Decision Note", "Reported Date"]
        res = rows("SELECT c.code, a.code asset_code, a.name asset_name, c.driver, c.location, c.category, c.priority, c.description, c.status, c.decided_by, c.decision_note, c.created_at FROM complaints c JOIN assets a ON a.id=c.asset_id ORDER BY c.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "work_orders":
        headers = ["Work Order ID", "Asset ID", "Asset Name", "Category", "Priority", "Description", "Assignee", "Status", "Findings", "Created By", "Created Date", "Completed Date", "Released Date"]
        res = rows("SELECT w.code, a.code asset_code, a.name asset_name, w.category, w.priority, w.description, w.assignee, w.status, w.findings, w.created_by, w.created_at, w.completed_at, w.released_at FROM work_orders w JOIN assets a ON a.id=w.asset_id ORDER BY w.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "inventory":
        headers = ["Stock ID", "Part Name", "Category", "Manufacturer", "OEM Part No", "Compatibility", "Unit", "Current Qty", "Min Qty", "Unit Cost (KWD)", "Total Valuation (KWD)", "Location"]
        res = rows("SELECT stock_id, name, category, manufacturer, oem_no, compat, unit, qty, min_qty, unit_cost, ROUND(qty * unit_cost, 3) total_val, location FROM parts ORDER BY stock_id")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "purchases":
        headers = ["Purchase ID", "Date", "Part Name", "Qty", "Currency", "Original Price", "Exchange Rate", "Unit Price (KWD)", "Total Amount (KWD)", "Supplier", "Invoice No", "Asset ID", "Work Order", "Status", "Purpose", "Requested By"]
        res = rows("SELECT p.code, p.created_at, p.part_name, p.qty, p.currency, p.original_price, p.exchange_rate, p.unit_price, ROUND(p.qty * COALESCE(p.unit_price, 0), 3) total_amt, p.supplier, p.invoice_no, a.code asset_code, w.code wo_code, p.status, CASE WHEN p.to_stock=1 THEN 'Restock' ELSE 'Work order' END purpose, p.requested_by FROM purchases p LEFT JOIN assets a ON a.id=p.asset_id LEFT JOIN work_orders w ON w.id=p.wo_id ORDER BY p.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "expenses":
        if not can("expense.view"): raise Bad("Not permitted to view expenses", 403)
        headers = ["Date", "Asset ID", "Asset Name", "Expense Type", "Currency", "Original Amount", "Exchange Rate", "Amount (KWD)", "Reference", "Note", "Recorded By"]
        res = rows("SELECT e.at, a.code asset_code, a.name asset_name, REPLACE(e.kind, '_', ' ') exp_type, e.currency, e.original_amount, e.exchange_rate, e.amount, e.ref, e.note, e.by FROM expenses e JOIN assets a ON a.id=e.asset_id ORDER BY e.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "historical":
        headers = ["Code", "Date", "Asset ID", "Asset Name", "Record Type", "Title", "Description", "Ref", "Invoice No", "Supplier / Vendor", "Performed By", "Cost (KWD)", "Status"]
        res = rows("SELECT h.code, h.record_date, a.code asset_code, a.name asset_name, h.record_type, h.title, h.description, h.work_order_ref, h.invoice_no, h.supplier_vendor, h.performed_by, h.cost, CASE WHEN h.verified=1 THEN 'Verified' ELSE 'Unverified' END status FROM historical_records h JOIN assets a ON a.id=h.asset_id ORDER BY h.record_date DESC, h.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "transfers":
        headers = ["Date", "Asset ID", "Asset Name", "From Worksite", "To Worksite", "Odometer / Hours", "Transporter", "Reason", "Authorized By"]
        res = rows("SELECT t.at, a.code asset_code, a.name asset_name, t.from_site, t.to_site, t.odometer_hours, t.transporter, t.reason, t.by FROM transfers t JOIN assets a ON a.id=t.asset_id ORDER BY t.id DESC")
        data_rows = [list(r.values()) for r in res]
    elif rtype == "compliance":
        headers = ["Asset ID", "Asset Name", "Category", "Kuwait Plate", "Plate Category", "Traffic Dept (Daftar) Expiry", "Technical Inspection (Fahs Fanni)", "Insurance Company", "Insurance Policy", "Insurance Expiry", "PACI No", "Worksite"]
        res = rows("SELECT a.code, a.name, a.category, a.reg_no, a.plate_category, a.reg_expiry, a.inspection_expiry, a.insurance_company, a.insurance_policy, a.insurance_expiry, a.paci_no, w.name worksite FROM assets a LEFT JOIN worksites w ON w.id=a.worksite_id WHERE a.archived=0 ORDER BY a.code")
        data_rows = [list(r.values()) for r in res]
    else:
        raise Bad("Unknown report type")

    if fmt == "csv":
        return make_csv_response(f"fleethub_report_{rtype}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv", headers, data_rows)
    return jsonify(headers=headers, rows=data_rows, count=len(data_rows))

@report_bp.get("/api/dashboard")
@need("asset.view")
def dash():
    c = get_db()
    n = lambda s: c.execute(s).fetchone()[0]
    in_30_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring_ins = n(f"SELECT COUNT(*) FROM assets WHERE archived=0 AND insurance_expiry IS NOT NULL AND insurance_expiry != '' AND insurance_expiry <= '{in_30_days}'")
    expiring_reg = n(f"SELECT COUNT(*) FROM assets WHERE archived=0 AND reg_expiry IS NOT NULL AND reg_expiry != '' AND reg_expiry <= '{in_30_days}'")
    expiring_insp = n(f"SELECT COUNT(*) FROM assets WHERE archived=0 AND inspection_expiry IS NOT NULL AND inspection_expiry != '' AND inspection_expiry <= '{in_30_days}'")
    d = dict(
        assets=n("SELECT COUNT(*) FROM assets WHERE archived=0"),
        active=n("SELECT COUNT(*) FROM assets WHERE status='Active' AND archived=0"),
        under_repair=n("SELECT COUNT(*) FROM assets WHERE status='Under Repair' AND archived=0"),
        out_of_service=n("SELECT COUNT(*) FROM assets WHERE status='Out of Service' AND archived=0"),
        complaints_new=n("SELECT COUNT(*) FROM complaints WHERE status='New'"),
        wo_open=n("SELECT COUNT(*) FROM work_orders WHERE status NOT IN ('Released','Rejected','Cancelled')"),
        wo_waiting=n("SELECT COUNT(*) FROM work_orders WHERE status LIKE 'Waiting%'"),
        pending_purchases=n("SELECT COUNT(*) FROM purchases WHERE status='Requested'"),
        low_stock=n("SELECT COUNT(*) FROM parts WHERE min_qty>0 AND qty<=min_qty"),
        total_parts=n("SELECT COUNT(*) FROM parts"),
        pending_inspection=n("SELECT COUNT(*) FROM work_orders WHERE status='Pending Inspection'"),
        suppliers_count=n("SELECT COUNT(*) FROM suppliers WHERE active=1"),
        historical_records=n("SELECT COUNT(*) FROM historical_records"),
        expiring_docs=expiring_ins + expiring_reg + expiring_insp,
        expiring_reg=expiring_reg,
        expiring_insp=expiring_insp,
        expiring_ins=expiring_ins,
        categories=rows("SELECT category, COUNT(*) as count FROM assets WHERE archived=0 GROUP BY category ORDER BY count DESC LIMIT 8"),
        status_breakdown=rows("SELECT status, COUNT(*) as count FROM assets WHERE archived=0 GROUP BY status")
    )
    if can("expense.view"):
        d["monthly"] = rows("SELECT strftime('%Y-%m',at) month, ROUND(SUM(amount),3) total FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12")[::-1]
        d["yearly"] = rows("SELECT strftime('%Y',at) year, ROUND(SUM(amount),3) total FROM expenses GROUP BY year ORDER BY year DESC")
        d["by_kind"] = rows("SELECT kind, ROUND(SUM(amount),3) total FROM expenses GROUP BY kind ORDER BY total DESC")
        d["total_spend"] = round(c.execute("SELECT COALESCE(SUM(amount),0) FROM expenses").fetchone()[0], 3)
    d["recent_wo"] = rows("SELECT w.code, w.description, w.status, w.created_at, a.code asset_code, a.name asset_name FROM work_orders w JOIN assets a ON a.id=w.asset_id ORDER BY w.id DESC LIMIT 5")
    d["recent_complaints"] = rows("SELECT c.code, c.description, c.priority, c.status, c.created_at, a.code asset_code, a.name asset_name FROM complaints c JOIN assets a ON a.id=c.asset_id ORDER BY c.id DESC LIMIT 5")
    return jsonify(d)

@report_bp.get("/api/alerts")
@need("asset.view")
def live_alerts():
    c = get_db()
    low_parts = rows("SELECT id, stock_id, name, qty, min_qty, unit FROM parts WHERE min_qty > 0 AND qty <= min_qty ORDER BY qty ASC LIMIT 50")
    today = datetime.now().strftime("%Y-%m-%d")
    in_30_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    ins_exp = rows("SELECT id, code, name, reg_no, insurance_company, insurance_policy, insurance_expiry FROM assets WHERE archived=0 AND insurance_expiry IS NOT NULL AND insurance_expiry != '' AND insurance_expiry <= ? ORDER BY insurance_expiry ASC LIMIT 50", (in_30_days,))
    for x in ins_exp: x["expired"] = x["insurance_expiry"] < today
    reg_exp = rows("SELECT id, code, name, reg_no, plate_category, reg_expiry FROM assets WHERE archived=0 AND reg_expiry IS NOT NULL AND reg_expiry != '' AND reg_expiry <= ? ORDER BY reg_expiry ASC LIMIT 50", (in_30_days,))
    for x in reg_exp: x["expired"] = x["reg_expiry"] < today
    insp_exp = rows("SELECT id, code, name, reg_no, plate_category, inspection_expiry FROM assets WHERE archived=0 AND inspection_expiry IS NOT NULL AND inspection_expiry != '' AND inspection_expiry <= ? ORDER BY inspection_expiry ASC LIMIT 50", (in_30_days,))
    for x in insp_exp: x["expired"] = x["inspection_expiry"] < today

    pending_complaints = c.execute("SELECT COUNT(*) FROM complaints WHERE status IN ('New', 'Info Requested')").fetchone()[0]
    pending_wo_inspection = c.execute("SELECT COUNT(*) FROM work_orders WHERE status='Pending Inspection'").fetchone()[0]
    pending_purchases = c.execute("SELECT COUNT(*) FROM purchases WHERE status='Requested'").fetchone()[0]
    total_alerts = len(low_parts) + len(ins_exp) + len(reg_exp) + len(insp_exp) + (pending_complaints if can("complaint.review") else 0) + (pending_wo_inspection if can("wo.manage") else 0) + (pending_purchases if can("purchase.approve") else 0)
    return jsonify(
        total=total_alerts, low_stock=low_parts, insurance_expiring=ins_exp,
        reg_expiring=reg_exp, inspection_expiring=insp_exp, pending_complaints=pending_complaints,
        pending_wo_inspection=pending_wo_inspection, pending_purchases=pending_purchases
    )

@report_bp.get("/api/notifications")
@need(None)
def notif_list():
    r = session["role"]
    uid = session["uid"]
    return jsonify(rows("SELECT * FROM notifications WHERE (user_id=? OR target_role=? OR target_role IS NULL) ORDER BY read ASC, id DESC LIMIT 50", (uid, r)))

@report_bp.post("/api/notifications/<int:i>/read")
@need(None)
def notif_read(i):
    with tx() as c:
        c.execute("UPDATE notifications SET read=1 WHERE id=?", (i,))
    notify_sync("notification_read", {"id": i})
    return jsonify(ok=1)

@report_bp.post("/api/notifications/read-all")
@need(None)
def notif_read_all():
    r = session["role"]
    uid = session["uid"]
    with tx() as c:
        c.execute("UPDATE notifications SET read=1 WHERE user_id=? OR target_role=? OR target_role IS NULL", (uid, r))
    notify_sync("notification_read_all")
    return jsonify(ok=1)

@report_bp.get("/api/audit")
@need("user.manage")
def audit_list():
    return jsonify(rows("SELECT * FROM audit ORDER BY id DESC LIMIT 300"))

@report_bp.post("/api/admin/backup")
@need("settings")
def backup():
    fn = "fleethub-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".db"
    dst = sqlite3.connect(os.path.join(config.BACKUP_DIR, fn))
    get_db().backup(dst)
    dst.close()
    with tx():
        audit("backup", "system", 0, fn)
    return jsonify(file=fn)

@report_bp.get("/api/admin/backups")
@need("settings")
def backup_list():
    files = []
    if os.path.exists(config.BACKUP_DIR):
        for f in os.listdir(config.BACKUP_DIR):
            if f.endswith(".db"):
                fp = os.path.join(config.BACKUP_DIR, f)
                files.append({
                    "filename": f,
                    "size_bytes": os.path.getsize(fp),
                    "created_at": datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%Y-%m-%d %H:%M:%S")
                })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(backups=files)
