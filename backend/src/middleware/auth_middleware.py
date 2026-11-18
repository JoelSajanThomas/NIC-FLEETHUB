"""Authentication and authorization middleware matching Fleethub permissions."""
import functools
from flask import session
from .error_middleware import Bad

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

def can(p):
    """Check whether active session role has permission p."""
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
            if "uid" not in session:
                raise Bad("Sign in required", 401)
            if p and not can(p):
                raise Bad("You do not have permission for this action", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user():
    """Retrieve current session user information."""
    if "uid" not in session:
        return None
    return {
        "id": session.get("uid"),
        "name": session.get("name"),
        "role": session.get("role"),
        "lang": session.get("lang", "en")
    }
