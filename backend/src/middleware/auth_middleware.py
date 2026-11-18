"""Authentication and authorization middleware matching Fleethub permissions."""
import functools
from flask import session, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from .error_middleware import Bad
from ..config import config

ROLES = {
    "super_admin": "*",
    "company_admin": "*",
    "admin": "*",
    "transport": {"asset.view", "asset.edit", "complaint.create", "complaint.review", "wo.view", "report.view", "historical.view"},
    "mechanical": {"asset.view", "asset.edit", "wo.view", "wo.manage", "wo.update", "inventory.view", "purchase.create", "report.view", "historical.view", "historical.manage"},
    "workshop": {"asset.view", "wo.view", "wo.manage", "wo.update", "inventory.view", "inventory.issue", "purchase.create", "historical.view"},
    "mechanic": {"asset.view", "wo.view", "wo.update", "inventory.view", "historical.view"},
    "inventory": {"asset.view", "wo.view", "inventory.view", "inventory.manage", "inventory.issue", "purchase.record", "supplier.manage", "report.view"},
    "procurement": {"asset.view", "inventory.view", "purchase.create", "purchase.record", "expense.view", "expense.manage", "supplier.manage", "report.view"},
    "driver": {"complaint.create"},
    "management": {"asset.view", "wo.view", "inventory.view", "expense.view", "report.view", "purchase.approve", "historical.view"},
}

def get_auth_serializer():
    return URLSafeTimedSerializer(config.SECRET_KEY, salt="fleethub-auth")

def issue_token(data):
    """Generate signed bearer token valid for 7 days."""
    return get_auth_serializer().dumps(data)

def verify_token(token):
    """Verify signed bearer token."""
    try:
        return get_auth_serializer().loads(token, max_age=86400 * 7)
    except (BadSignature, SignatureExpired, Exception):
        return None

def check_bearer_auth():
    """Extract session data from Authorization: Bearer token or token query param, taking precedence over session cookies."""
    auth_hdr = request.headers.get("Authorization", "")
    token = None
    if auth_hdr.startswith("Bearer "):
        token = auth_hdr[7:].strip()
    elif request.args.get("token"):
        token = request.args.get("token").strip()
    elif request.args.get("auth"):
        token = request.args.get("auth").strip()

    if token:
        t_data = verify_token(token)
        if t_data and isinstance(t_data, dict) and "uid" in t_data:
            session.clear()
            session.update(t_data)

def can(p):
    """Check whether active session role has permission p."""
    check_bearer_auth()
    role = session.get("role")
    s = ROLES.get(role, set())
    if s == "*": return True
    if p is None: return True
    if p in s: return True
    if p == "supplier.view" and (can("inventory.view") or can("purchase.create") or can("expense.view") or can("supplier.manage")):
        return True
    if p == "historical.view" and can("asset.view"):
        return True
    if p == "historical.manage" and (can("asset.edit") or can("wo.manage")):
        return True
    if p == "settings" and role in ("super_admin", "company_admin", "admin"):
        return True
    return False

def need(p):
    """Decorator to enforce permission requirement on route handlers."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            check_bearer_auth()
            if "uid" not in session:
                raise Bad("Sign in required", 401)
            if p and not can(p):
                raise Bad("You do not have permission for this action", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user():
    """Retrieve current session user information."""
    check_bearer_auth()
    if "uid" not in session:
        return None
    return {
        "id": session.get("uid"),
        "name": session.get("name"),
        "role": session.get("role"),
        "lang": session.get("lang", "en")
    }
