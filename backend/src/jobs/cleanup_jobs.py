"""Background and maintenance cleanup routines."""
import os, time
from ..config import config

def clean_old_backups(keep_days=30):
    """Remove backup files older than specified days."""
    now_ts = time.time()
    cutoff = now_ts - (keep_days * 86400)
    cleaned = 0
    if os.path.exists(config.BACKUP_DIR):
        for f in os.listdir(config.BACKUP_DIR):
            fp = os.path.join(config.BACKUP_DIR, f)
            if os.path.isfile(fp) and os.path.getmtime(fp) < cutoff:
                try:
                    os.remove(fp)
                    cleaned += 1
                except Exception:
                    pass
    return cleaned
