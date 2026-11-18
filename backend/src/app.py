"""NIC FleetHub - Enterprise Fleet, Workshop & Inventory Backend Application.
Modular, scalable Python Flask service with SQLite database engine.
"""
import os, sys
from flask import Flask, send_from_directory, jsonify

# Ensure source, backend, and project root are on sys.path
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SRC_DIR)
ROOT_DIR = os.path.dirname(BACKEND_DIR)

for path_dir in (SRC_DIR, BACKEND_DIR, ROOT_DIR):
    if path_dir not in sys.path:
        sys.path.insert(0, path_dir)

try:
    from .config import config
    from .database.connection import close_db
    from .database.migrations.runner import run_migrations
    from .database.seeds.seed_data import seed_defaults
    from .middleware.cors_middleware import init_cors
    from .middleware.error_middleware import register_error_handlers, Bad
    from .routes.api_router import register_routes
except (ImportError, ValueError):
    from src.config import config
    from src.database.connection import close_db
    from src.database.migrations.runner import run_migrations
    from src.database.seeds.seed_data import seed_defaults
    from src.middleware.cors_middleware import init_cors
    from src.middleware.error_middleware import register_error_handlers, Bad
    from src.routes.api_router import register_routes

def create_app():
    """Application factory for NIC FleetHub Backend."""
    app = Flask(__name__, static_folder=None)
    app.secret_key = config.SECRET_KEY
    app.config.update(
        MAX_CONTENT_LENGTH=config.MAX_CONTENT_LENGTH,
        SESSION_COOKIE_HTTPONLY=config.SESSION_COOKIE_HTTPONLY,
        SESSION_COOKIE_SAMESITE=config.SESSION_COOKIE_SAMESITE,
        PERMANENT_SESSION_LIFETIME=config.PERMANENT_SESSION_LIFETIME
    )

    # Database teardown
    app.teardown_appcontext(close_db)

    # Middleware
    register_error_handlers(app)
    init_cors(app)

    # Routes
    register_routes(app)

    # API 404 Fallback
    @app.route("/api/<path:p>", methods=["GET", "POST", "PUT", "DELETE"])
    def api_404(p):
        raise Bad("Unknown API route", 404)

    # Static UI Serving for unified deployment
    frontend_dir = os.path.join(ROOT_DIR, "frontend")

    @app.get("/")
    def serve_index():
        if os.path.exists(os.path.join(frontend_dir, "index.html")):
            return send_from_directory(frontend_dir, "index.html")
        return jsonify(name=config.APP_NAME, status="Backend operational", port=config.PORT)

    @app.get("/app")
    def serve_app_console():
        if os.path.exists(os.path.join(frontend_dir, "app.html")):
            return send_from_directory(frontend_dir, "app.html")
        return jsonify(error="Console UI not found"), 404

    @app.get("/<path:p>")
    def serve_static_file(p):
        target = os.path.join(frontend_dir, p)
        if os.path.isfile(target):
            return send_from_directory(frontend_dir, p)
        pub_target = os.path.join(frontend_dir, "public", p)
        if os.path.isfile(pub_target):
            return send_from_directory(os.path.join(frontend_dir, "public"), p)
        return jsonify(error="Not found"), 404

    # Run database initialization
    with app.app_context():
        run_migrations()
        seed_defaults()

    return app

app = create_app()

if __name__ == "__main__":
    print(f"Starting {config.DEFAULT_COUNTRY} FleetHub Backend on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
