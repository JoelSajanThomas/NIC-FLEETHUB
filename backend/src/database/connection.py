"""SQLite Database Connection and Transaction Management."""
import sqlite3
from contextlib import contextmanager
from flask import g
from ..config import config
from ..utils.helpers import now

def connect():
    """Create a raw connection to the SQLite database with proper pragmas."""
    c = sqlite3.connect(config.DB_PATH, timeout=30.0)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    c.execute("PRAGMA journal_mode = WAL")
    return c

def get_db():
    """Retrieve the application context database connection."""
    if "db" not in g:
        g.db = connect()
    return g.db

db = get_db

def close_db(e=None):
    """Close the current application context database connection."""
    d = g.pop("db", None)
    if d is not None:
        d.close()

@contextmanager
def tx():
    """Transaction context manager that commits and triggers sync broadcast."""
    c = get_db()
    try:
        yield c.cursor()
        c.commit()
        try:
            from ..services.sync_service import notify_sync
            notify_sync("db_commit")
        except Exception:
            pass
    except Exception:
        c.rollback()
        raise

def one(sql, args=()):
    """Fetch single row as dictionary or None."""
    cur = get_db().execute(sql, args)
    r = cur.fetchone()
    return dict(r) if r else None

def rows(sql, args=()):
    """Fetch multiple rows as list of dictionaries."""
    cur = get_db().execute(sql, args)
    return [dict(r) for r in cur.fetchall()]

def audit(action, entity, eid, detail=""):
    """Write an entry to the audit log table."""
    from flask import session
    u = session.get("username", session.get("name", "system"))
    with tx() as cur:
        cur.execute(
            "INSERT INTO audit(user, action, entity, entity_id, detail, at) VALUES(?,?,?,?,?,?)",
            (u, action, entity, str(eid), detail, now())
        )

def notify(role, title, message, kind="system", link="", user_id=None):
    """Write a notification entry for targeted role or user."""
    with tx() as cur:
        cur.execute(
            "INSERT INTO notifications(user_id, target_role, title, message, kind, link, created_at) VALUES(?,?,?,?,?,?,?)",
            (user_id, role, title, message, kind, link, now())
        )
