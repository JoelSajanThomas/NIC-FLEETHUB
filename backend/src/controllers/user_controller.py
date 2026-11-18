"""User management controller."""
from flask import Blueprint, jsonify
from werkzeug.security import generate_password_hash
from ..database.connection import one, rows, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need
from ..services.sync_service import notify_sync
from ..utils.helpers import P

user_bp = Blueprint("users", __name__)

@user_bp.get("/api/users")
@need("user.manage")
def list_users():
    return jsonify(rows("SELECT id,username,name,role,active,preferred_lang FROM users ORDER BY id"))

@user_bp.post("/api/users")
@need("user.manage")
def create_user():
    p = P()
    u = (p.get("username") or "").strip().lower()
    pw = p.get("password") or ""
    n = (p.get("name") or "").strip()
    r = p.get("role") or "viewer"
    lang = p.get("preferred_lang") or "en"
    if not u or len(pw) < 6 or not n:
        raise Bad("User name, name, and 6+ character password are required")
    with tx() as cur:
        cur.execute("INSERT INTO users(username,name,role,pw,active,preferred_lang) VALUES(?,?,?,?,1,?)",
                    (u, n, r, generate_password_hash(pw), lang))
        uid = cur.lastrowid
        audit("create", "user", uid, f"{u} ({r})")
    notify_sync("user_create", {"user_id": uid, "username": u})
    return jsonify(id=uid, username=u, name=n, role=r, preferred_lang=lang)

@user_bp.put("/api/users/<int:i>")
@need("user.manage")
def edit_user(i):
    p = P()
    n = (p.get("name") or "").strip()
    r = p.get("role") or "viewer"
    pw = p.get("password") or ""
    lang = p.get("preferred_lang") or "en"
    if not n:
        raise Bad("Name is required")
    with tx() as cur:
        if pw:
            if len(pw) < 6:
                raise Bad("Password must be 6+ characters")
            cur.execute("UPDATE users SET name=?, role=?, pw=?, preferred_lang=? WHERE id=?",
                        (n, r, generate_password_hash(pw), lang, i))
        else:
            cur.execute("UPDATE users SET name=?, role=?, preferred_lang=? WHERE id=?", (n, r, lang, i))
        audit("edit", "user", i, f"name={n}, role={r}")
    notify_sync("user_edit", {"user_id": i})
    return jsonify(ok=1)

@user_bp.post("/api/users/<int:i>/toggle")
@need("user.manage")
def toggle_user(i):
    u = one("SELECT active FROM users WHERE id=?", (i,))
    if not u:
        raise Bad("User not found", 404)
    new_state = 0 if u["active"] else 1
    with tx() as cur:
        cur.execute("UPDATE users SET active=? WHERE id=?", (new_state, i))
        audit("toggle", "user", i, f"active={new_state}")
    notify_sync("user_toggle", {"user_id": i, "active": new_state})
    return jsonify(ok=1, active=new_state)
