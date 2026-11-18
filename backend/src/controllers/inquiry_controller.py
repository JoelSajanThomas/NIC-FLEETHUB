"""Website inquiries controller."""
from flask import Blueprint, jsonify, request
from ..database.connection import tx
from ..middleware.error_middleware import Bad
from ..services.sync_service import notify_sync
from ..utils.helpers import now

inquiry_bp = Blueprint("inquiries", __name__)

@inquiry_bp.post("/api/inquiries")
def submit_inquiry():
    p = request.get_json(silent=True) or {}
    name = (p.get("name") or "").strip()
    email = (p.get("email") or "").strip()
    msg = (p.get("message") or "").strip()
    if not name or not msg:
        raise Bad("Name and inquiry message are required", 400)

    title = f"Website Inquiry: {name}"
    body = f"Email: {email or 'N/A'}\nMessage: {msg}"
    with tx() as c:
        c.execute("""
            INSERT INTO notifications(target_role, title, message, kind, link, read, created_at)
            VALUES('management', ?, ?, 'inquiry', '/app', 0, ?)
        """, (title, body, now()))

    notify_sync("inquiry")
    return jsonify(ok=True, message="Inquiry submitted successfully")
