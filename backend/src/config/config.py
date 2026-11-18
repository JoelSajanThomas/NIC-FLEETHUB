"""Configuration module for NIC FleetHub Backend."""
import os, secrets
from datetime import timedelta

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIR = os.path.join(BACKEND_DIR, "src")

# Data directories
DATA_DIR = os.environ.get("FLEETHUB_DATA", os.path.join(BACKEND_DIR, "data"))
UPLOAD_DIR = os.environ.get("FLEETHUB_UPLOADS", os.path.join(BACKEND_DIR, "uploads"))
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
DB_PATH = os.environ.get("FLEETHUB_DB", os.path.join(DATA_DIR, "fleethub.db"))

for d in (DATA_DIR, UPLOAD_DIR, BACKUP_DIR, os.path.join(UPLOAD_DIR, "documents"),
          os.path.join(UPLOAD_DIR, "invoices"), os.path.join(UPLOAD_DIR, "images"),
          os.path.join(UPLOAD_DIR, "audio")):
    os.makedirs(d, exist_ok=True)

# Secret key
KEY_PATH = os.path.join(DATA_DIR, "secret.key")
if not os.path.exists(KEY_PATH):
    with open(KEY_PATH, "w", encoding="utf-8") as f:
        f.write(secrets.token_hex(32))
with open(KEY_PATH, "r", encoding="utf-8") as f:
    SECRET_KEY = f.read().strip()

# Network and Server
PORT = int(os.environ.get("PORT", os.environ.get("FLEETHUB_PORT", 5000)))
HOST = os.environ.get("HOST", "0.0.0.0")
DEBUG = os.environ.get("DEBUG", "0").lower() in ("1", "true", "yes")

# CORS Allowed Origins
CORS_ORIGINS = [
    origin.strip() for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000,http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if origin.strip()
]

# File Limits
MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB

# Session config
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

# Regional defaults
DEFAULT_COUNTRY = "Kuwait"
DEFAULT_CURRENCY = "KWD"
DEFAULT_LANGUAGE = "en"
