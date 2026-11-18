"""Real-time data synchronization controller."""
from flask import Blueprint, jsonify
from ..database.connection import get_db
from ..services.sync_service import get_sync_version, create_sse_stream, compute_public_stats
from ..utils.helpers import now

sync_bp = Blueprint("sync", __name__)

@sync_bp.get("/api/sync/version")
def api_sync_version():
    """Return the current database sync version token for lightweight polling."""
    return jsonify(version=get_sync_version(), at=now())

@sync_bp.get("/api/sync/events")
def api_sync_events():
    """Server-Sent Events endpoint streaming live database commit notifications."""
    return create_sse_stream()

@sync_bp.get("/api/public/stats")
def api_public_stats():
    """Public operational fleet and maintenance statistics computed directly from SQLite."""
    stats = compute_public_stats(get_db())
    return jsonify(stats)
