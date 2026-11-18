"""NIC FleetHub - Enterprise Fleet, Workshop, Inventory & Maintenance Management System.
National Industries Company (K.S.C.C) - Kuwait Operations.

This root server.py file serves as the primary application entry point,
seamlessly delegating execution to the modular backend architecture in `backend/src/app.py`.
"""
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.src.app import app, create_app
from backend.src.config import config

if __name__ == "__main__":
    print("==================================================================")
    print(f" NIC FleetHub Server - {config.COMPANY_NAME} ({config.DEFAULT_COUNTRY})")
    print(f" Listening on http://{config.HOST}:{config.PORT}")
    print("==================================================================")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
