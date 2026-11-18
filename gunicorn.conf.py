import os

# Automatically bind to Render's dynamic $PORT (or fallback to 5000)
port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{port}"

# Worker processes and threads (1 worker + 4 threads to fit within Render 512MB RAM)
workers = int(os.environ.get("WEB_CONCURRENCY", 1))
threads = 4
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
