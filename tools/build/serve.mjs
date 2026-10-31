import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const PORT = Number(process.env.PORT || 8000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm"
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const relative = clean.replace(/^\/+/, "");
  const target = path.join(ROOT, relative);
  if (!target.startsWith(ROOT)) {
    return null;
  }
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return target;
  }
  const indexFile = path.join(target, "index.html");
  if (fs.existsSync(indexFile)) {
    return indexFile;
  }
  const notFound = path.join(ROOT, "404.html");
  if (fs.existsSync(notFound)) {
    return notFound;
  }
  return null;
}

const server = http.createServer(function (req, res) {
  const file = resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext] || "application/octet-stream";
  const isError = path.basename(file) === "404.html" && !(req.url || "").startsWith("/404");
  res.writeHead(isError ? 404 : 200, { "Content-Type": type });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, function () {
  console.log("Annoying Goods dev server on http://localhost:" + String(PORT));
});
