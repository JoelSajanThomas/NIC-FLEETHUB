"""Test package initialization.
Automatically isolates the test database in a temporary directory
to prevent test fixtures and temporary data from ever polluting fleethub.db.
"""
import os, tempfile, shutil, atexit

_TEST_DIR = tempfile.mkdtemp(prefix="fleethub_test_")
_TEST_DB = os.path.join(_TEST_DIR, "test_fleethub.db")

os.environ["FLEETHUB_DB"] = _TEST_DB
os.environ["FLEETHUB_DATA"] = _TEST_DIR
os.environ["FLEETHUB_UPLOADS"] = os.path.join(_TEST_DIR, "uploads")

try:
    from src.config import config
    config.DB_PATH = _TEST_DB
    config.DATA_DIR = _TEST_DIR
    config.UPLOAD_DIR = os.environ["FLEETHUB_UPLOADS"]
    config.BACKUP_DIR = os.path.join(_TEST_DIR, "backups")
    os.makedirs(config.BACKUP_DIR, exist_ok=True)
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

def _cleanup():
    try:
        shutil.rmtree(_TEST_DIR, ignore_errors=True)
    except Exception:
        pass

atexit.register(_cleanup)
