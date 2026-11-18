"""Central API router registering all modular controllers."""
from ..controllers import (
    auth_bp, user_bp, site_bp, supplier_bp, currency_bp, voice_bp,
    sync_bp, demo_bp, inquiry_bp, asset_bp, complaint_bp,
    work_order_bp, inventory_bp, purchase_bp, expense_bp,
    historical_bp, report_bp
)

def register_routes(app):
    """Register all modular blueprints to the Flask application."""
    blueprints = [
        auth_bp, user_bp, site_bp, supplier_bp, currency_bp, voice_bp,
        sync_bp, demo_bp, inquiry_bp, asset_bp, complaint_bp,
        work_order_bp, inventory_bp, purchase_bp, expense_bp,
        historical_bp, report_bp
    ]
    for bp in blueprints:
        app.register_blueprint(bp)
