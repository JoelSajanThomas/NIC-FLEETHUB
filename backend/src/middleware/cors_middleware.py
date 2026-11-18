"""CORS middleware for cross-origin frontend-backend communication."""
from flask import request
from ..config import config

def init_cors(app):
    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and (origin in config.CORS_ORIGINS or "*" in config.CORS_ORIGINS):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Cache-Control, Accept"
        elif not origin:
            response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    @app.route("/api/<path:path>", methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def options_preflight(path=None):
        return "", 204
