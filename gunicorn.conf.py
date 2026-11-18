import os

# Render dynamically routes traffic to either PORT (default 10000 or custom 5000).
# We bind to all active ports so Render's port scanner succeeds on both 10000 and 5000.
active_ports = {"10000", "5000"}
if os.environ.get("PORT"):
    active_ports.add(str(os.environ["PORT"]).strip())

bind = [f"0.0.0.0:{p}" for p in sorted(active_ports)]

# Worker processes and threads (1 worker + 4 threads to fit within Render 512MB RAM)
workers = int(os.environ.get("WEB_CONCURRENCY", 1))
threads = 4
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
