"""Demo Data Management controller."""
import os, sqlite3
from datetime import datetime
from flask import Blueprint, jsonify, session
from ..config import config
from ..database.connection import get_db, connect, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.demo_service import (
    get_demo_counts, load_demo_dataset, clear_demo_dataset, CLEANUP_LOCK
)
from ..services.sync_service import notify_sync

demo_bp = Blueprint("demo", __name__)

@demo_bp.get("/api/admin/demo/status")
@need("user.manage")
def demo_status():
    return jsonify(get_demo_counts())

@demo_bp.get("/api/admin/demo/preview")
@need("user.manage")
def demo_preview():
    c = connect()
    d_assets = [dict(r) for r in c.execute("SELECT id, code, name, category, reg_no, status, purchase_cost FROM assets WHERE is_demo = 1 ORDER BY id").fetchall()]
    d_wo = [dict(r) for r in c.execute("SELECT w.id, w.code, w.description, w.status, w.priority, a.name asset_name FROM work_orders w JOIN assets a ON a.id=w.asset_id WHERE w.is_demo = 1 ORDER BY w.id").fetchall()]
    d_parts = [dict(r) for r in c.execute("SELECT id, stock_id, name, qty, unit_cost FROM parts WHERE is_demo = 1 ORDER BY id").fetchall()]
    d_exp = [dict(r) for r in c.execute("SELECT e.id, e.kind, e.amount, e.ref, a.name asset_name FROM expenses e JOIN assets a ON a.id=e.asset_id WHERE e.is_demo = 1 ORDER BY e.id").fetchall()]
    c.close()
    return jsonify(assets=d_assets, work_orders=d_wo, parts=d_parts, expenses=d_exp)

@demo_bp.post("/api/admin/demo/load")
@need("user.manage")
def demo_load():
    with tx() as c:
        load_demo_dataset(c)
        audit("load_demo_data", "demo", "0", "Loaded standard Kuwait fleet demo dataset")
    notify_sync("demo_load")
    return jsonify(ok=True, message="Demo data loaded successfully.", status=get_demo_counts())

@demo_bp.post("/api/admin/demo/clear")
@need("user.manage")
def demo_clear():
    role = session.get("role")
    if role not in ("super_admin", "company_admin", "admin"):
        raise Bad("Only Super Admin or Company Admin can permanently clear demo data.", 403)

    if not CLEANUP_LOCK.acquire(blocking=False):
        raise Bad("Another demo data cleanup operation is currently in progress.", 409)

    try:
        backup_fn = "fleethub-pre-democleanup-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".db"
        dst = sqlite3.connect(os.path.join(config.BACKUP_DIR, backup_fn))
        get_db().backup(dst)
        dst.close()

        with tx() as c:
            counts, deleted_files = clear_demo_dataset(c)
            total_deleted = sum(counts.values())
            audit("clear_demo_data", "demo", "0", f"Permanently cleared {total_deleted} demo records and {deleted_files} files. Pre-cleanup backup: {backup_fn}")

        notify_sync("demo_clear")
        return jsonify(
            ok=True,
            message=f"Successfully cleared {total_deleted} demo records and {deleted_files} files.",
            total_deleted=total_deleted,
            deleted_files=deleted_files,
            counts=counts,
            backup_file=backup_fn,
            status=get_demo_counts()
        )
    finally:
        CLEANUP_LOCK.release()
