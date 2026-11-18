import os

# Dynamic port binding: Render automatically provides $PORT (default 10000)
port = str(os.environ.get("PORT", "10000")).strip()
bind = f"0.0.0.0:{port}"

# Concurrency: 2 workers with 4 threads = 8 concurrent request handlers
# FleetHub backend uses ~55MB RAM per worker, perfectly sized for Render 512MB free tier
workers = int(os.environ.get("WEB_CONCURRENCY", 2))
threads = 4
timeout = 60
keepalive = 5
max_requests = 1000
max_requests_jitter = 50
accesslog = "-"
errorlog = "-"
