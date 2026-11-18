/**
 * Zero-dependency Node.js Development Server for NIC FleetHub Frontend
 * Serves static assets, styles, and scripts on port 3000,
 * and seamlessly proxies /api and /uploads to the Python backend on port 5000.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = parseInt(process.env.PORT || "3000", 10);
const BACKEND_HOST = process.env.BACKEND_HOST || "127.0.0.1";
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || "5000", 10);
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf"
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;

  // 1. Proxy /api/* requests to backend
  if (pathname.startsWith("/api/")) {
    const proxyOptions = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${BACKEND_HOST}:${BACKEND_PORT}`,
        "x-forwarded-host": req.headers.host || `localhost:${PORT}`,
        "x-forwarded-proto": "http"
      }
    };

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
      // Set SSE or normal headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error(`[Proxy Error] Unable to connect to backend at http://${BACKEND_HOST}:${BACKEND_PORT}:`, err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Backend API unavailable. Ensure backend server is running on port " + BACKEND_PORT,
        details: err.message
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Static file resolution
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : (pathname === "/app" ? "app.html" : pathname));

  // If path doesn't exist, check inside public/ directory
  if (!fs.existsSync(filePath)) {
    const publicCandidate = path.join(PUBLIC_DIR, "public", pathname);
    if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
      filePath = publicCandidate;
    }
  }

  // Check if directory
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>404 Not Found</h1><p>The requested file ${pathname} was not found.</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const headers = {
      "Content-Type": pathname.endsWith("manifest.json") ? "application/manifest+json; charset=utf-8" : contentType,
      "Content-Length": stats.size,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": (ext === ".html" || pathname === "/sw.js") ? "no-cache, no-store, must-revalidate" : "max-age=3600"
    };

    if (pathname === "/sw.js") {
      headers["Service-Worker-Allowed"] = "/";
    }

    res.writeHead(200, headers);

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`=======================================================`);
  console.log(` NIC FleetHub Frontend Server running at:`);
  console.log(` > Local:    http://localhost:${PORT}`);
  console.log(` > Network:  http://127.0.0.1:${PORT}`);
  console.log(` > Backend:  http://${BACKEND_HOST}:${BACKEND_PORT} (proxied)`);
  console.log(`=======================================================`);
});
