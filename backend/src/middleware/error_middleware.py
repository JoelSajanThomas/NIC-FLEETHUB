"""Error handling middleware for NIC FleetHub backend."""
import sqlite3
from flask import jsonify

class Bad(Exception):
    """Custom exception for operational errors with HTTP status codes."""
    def __init__(self, message, code=400):
        self.message = message
        self.code = code
        super().__init__(message)

def register_error_handlers(app):
    @app.errorhandler(Bad)
    def handle_bad(e):
        return jsonify(error=e.message), e.code

    @app.errorhandler(sqlite3.IntegrityError)
    def handle_integrity(e):
        return jsonify(error=f"Duplicate value or invalid reference ({str(e)})"), 409

    @app.errorhandler(ValueError)
    def handle_value_error(e):
        return jsonify(error="Invalid number or value"), 400

    @app.errorhandler(413)
    def handle_file_too_large(e):
        return jsonify(error="File too large (25 MB maximum)"), 413

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify(error="Resource or endpoint not found"), 404
