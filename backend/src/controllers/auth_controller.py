"""Authentication and session management controller."""
import time
from flask import Blueprint, jsonify, session
from werkzeug.security import check_password_hash
from ..database.connection import one, tx, audit
from ..middleware.error_middleware import Bad
from ..middleware.auth_middleware import need, ROLES, issue_token
from ..utils.helpers import P

auth_bp = Blueprint("auth", __name__)
FAIL = {}

@auth_bp.post("/api/login")
def login():
    p = P()
    u = (p.get("username") or "").strip().lower()
    f = FAIL.get(u, (0, 0))
    if f[0] >= 5 and time.time() < f[1]:
        raise Bad("Too many attempts. Try again in a minute.", 429)
    r = one("SELECT * FROM users WHERE username=? AND active=1", (u,))
    if not r or not check_password_hash(r["pw"], p.get("password") or ""):
        FAIL[u] = (f[0] + 1, time.time() + 60)
        raise Bad("Wrong user name or password", 401)
    FAIL.pop(u, None)
    session.clear()
    session.permanent = True
    session.update(
        uid=r["id"],
        username=r["username"],
        name=r["name"],
        role=r["role"],
        lang=r.get("preferred_lang") or "en"
    )
    audit("login", "user", r["id"])
    return me()

@auth_bp.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=1)

@auth_bp.get("/api/me")
@need(None)
def me():
    role = session.get("role", "")
    s = ROLES.get(role, set())
    u = one("SELECT preferred_lang FROM users WHERE id=?", (session["uid"],)) or {}
    user_lang = u.get("preferred_lang") or session.get("lang") or "en"
    token = issue_token({
        "uid": session["uid"],
        "username": session.get("username"),
        "name": session.get("name"),
        "role": role,
        "lang": user_lang
    })
    return jsonify(
        id=session["uid"],
        username=session.get("username"),
        name=session.get("name"),
        role=role,
        perms=["*"] if s == "*" else sorted(s),
        lang=user_lang,
        token=token
    )

@auth_bp.post("/api/user/lang")
@need(None)
def set_lang():
    p = P()
    lang = (p.get("lang") or "en").strip().lower()
    if lang not in ("en", "hi", "ar"):
        raise Bad("Invalid language. Supported: en, hi, ar", 400)
    session["lang"] = lang
    uid = session.get("uid")
    if uid:
        with tx() as cur:
            cur.execute("UPDATE users SET preferred_lang = ? WHERE id = ?", (lang, uid))
    return jsonify(ok=True, lang=lang)
