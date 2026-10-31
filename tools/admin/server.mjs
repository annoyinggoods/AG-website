// The dev-only helper for the control panel.
// It runs on the loopback address, serves the panel and the built site, and
// writes files inside the repository. It never ships and it never touches
// anything outside the project folder.

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { ROOT, PANEL_DIR, CONTENT_DIR } from "./paths.mjs";
import { readText, writeText, resolveInside, relativeToRoot } from "./safe-files.mjs";
import { readBody } from "./body.mjs";
import { handleDeploy, newestSnapshot } from "./deploy.mjs";
import { replaceElementText } from "./html-edit.mjs";
import { saveStyle, readStyle, readRegistry } from "./styles.mjs";
import {
  cardLinkOf,
  draftFile,
  entryFile,
  entrySource,
  excerptFor,
  moveToTrash,
  readCollection,
  readOneEntry,
  readTrash,
  restoreFromTrash
} from "./entries.mjs";
import { buildStamp, STALE_MESSAGE } from "./stamp.mjs";
import { logChange, closeSession } from "./session.mjs";
import { builtPages, readTree } from "./tree.mjs";

const PORT = Number(process.env.ADMIN_PORT || 8787);
const HOST = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm"
};

// The folders the preview needs and the files the build writes in the root.
const ASSET_FOLDERS = ["assets", "styles", "scripts", "api", "wasm/pkg", "dist"];
const ROOT_FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml", "search-index.json"];

function fail(message) {
  throw new Error(message);
}

function sendJson(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

function serveStatic(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = TYPES[ext] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(response);
}

// The files the preview may show: the built pages and the public assets.
function allowedFiles() {
  const files = new Set();
  for (const page of builtPages()) {
    files.add(relativeToRoot(page));
  }
  for (const name of ROOT_FILES) {
    if (fs.existsSync(path.join(ROOT, name))) {
      files.add(name);
    }
  }
  return files;
}

function isAllowedAsset(name) {
  for (const folder of ASSET_FOLDERS) {
    if (name.indexOf(folder + "/") === 0) {
      return true;
    }
  }
  return false;
}

// The folders that hold pages, so a missing page inside them is a 404 and
// not a forbidden file.
function pageFolders() {
  const folders = new Set();
  for (const entry of readTree()) {
    const trimmed = entry.path.replace(/^\/+/, "").replace(/\/+$/, "");
    if (trimmed !== "") {
      folders.add(trimmed.split("/")[0]);
    }
  }
  return folders;
}

function serveSite(response, urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  if (clean === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }
  const relative = clean.replace(/^\/+/, "");
  const trimmed = relative.replace(/\/+$/, "");
  const candidates = trimmed === "" ? ["index.html"] : [trimmed + "/index.html", trimmed];
  const files = allowedFiles();
  for (const candidate of candidates) {
    if (!files.has(candidate) && !isAllowedAsset(candidate)) {
      continue;
    }
    const target = path.join(ROOT, candidate);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      serveStatic(response, target);
      return;
    }
  }
  const folders = pageFolders();
  const first = trimmed === "" ? "" : trimmed.split("/")[0];
  if (folders.has(first)) {
    const notFound = path.join(ROOT, "404.html");
    if (fs.existsSync(notFound)) {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(fs.readFileSync(notFound));
      return;
    }
  }
  response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("The panel only serves the built site, so this file is not on show.");
}

// The newest snapshot folder of a past release.
function writeDraft(draft) {
  const file = draftFile(draft);
  writeText(file, entrySource(draft));
  logChange([relativeToRoot(file)]);
  return { ok: true, message: "The draft is in content/drafts/" + path.basename(file) + ". The build never reads that folder." };
}

function createEntry(draft) {
  const target = entryFile(draft);
  writeText(target.file, entrySource(draft));
  logChange([relativeToRoot(target.file)]);
  const build = spawn(process.execPath, [path.join(ROOT, "tools", "build", "build.mjs")], {
    cwd: ROOT,
    stdio: "ignore"
  });
  build.on("error", function (err) {
    void err;
  });
  return {
    ok: true,
    message: "The entry " + target.collection + "/" + target.slug + " is written and the build is running."
  };
}

function trashEntry(collection, slug) {
  const moved = moveToTrash(collection, slug);
  logChange([relativeToRoot(moved.source), relativeToRoot(moved.target)]);
  return { ok: true, message: "The entry is in content/trash/" + path.basename(moved.target) + "." };
}

function restoreEntry(collection, slug) {
  const moved = restoreFromTrash(collection, slug);
  logChange([relativeToRoot(moved.source), relativeToRoot(moved.target)]);
  return { ok: true, message: "The entry " + collection + "/" + slug + " is back in its section." };
}

// The style change of the inspector, with the text of the element.
function saveInspectorChange(request) {
  const result = saveStyle(request);
  const changedFiles = result.changedFiles.slice();
  if (request.changedText === true && request.elementId) {
    const fragment = resolveInside(CONTENT_DIR, slugOf(String(request.page || "/")) + ".html");
    if (!fragment || !fs.existsSync(fragment)) {
      fail("The content fragment for the page " + String(request.page) + " could not be found.");
    }
    const replaced = replaceElementText(readText(fragment), String(request.elementId), String(request.text || ""));
    if (!replaced.ok) {
      fail(replaced.message);
    }
    writeText(fragment, replaced.source);
    changedFiles.push(relativeToRoot(fragment));
  }
  logChange(changedFiles);
  return {
    ok: true,
    message: changedFiles.length > 0
      ? "Saved " + changedFiles.join(", ") + ". Run npm run build and reload the preview to see it."
      : "Nothing was changed.",
    changedFiles: changedFiles
  };
}

function slugOf(pagePath) {
  const trimmed = pagePath === "/" ? "" : pagePath.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed.length === 0 ? "index" : trimmed.replace(/\//g, "-");
}

async function handleApi(request, response, url) {
  const route = url.pathname;
  if (route === "/api/health") {
    const stamp = buildStamp();
    sendJson(response, 200, { ok: true, root: ROOT, stale: stamp.stale, staleReason: stamp.reason });
    return true;
  }
  if (route === "/api/tree") {
    sendJson(response, 200, { entries: readTree() });
    return true;
  }
  if (route === "/api/registry") {
    sendJson(response, 200, readRegistry());
    return true;
  }
  if (route === "/api/snapshot") {
    const name = newestSnapshot();
    sendJson(response, 200, {
      name: name,
      path: name === "" ? "" : "dist/snapshots/" + name,
      folder: "dist/snapshots/"
    });
    return true;
  }
  if (route === "/api/entries") {
    const collection = url.searchParams.get("collection") || "";
    sendJson(response, 200, { entries: readCollection(collection) });
    return true;
  }
  if (route === "/api/entry") {
    const collection = url.searchParams.get("collection") || "";
    const slug = url.searchParams.get("slug") || "";
    sendJson(response, 200, { entry: readOneEntry(collection, slug) });
    return true;
  }
  if (route === "/api/trash") {
    sendJson(response, 200, { entries: readTrash() });
    return true;
  }
  if (route === "/api/excerpt") {
    const body = await readBody(request);
    const answer = excerptFor(String(body.body || ""), String(body.excerpt || ""));
    sendJson(response, 200, {
      excerpt: answer.excerpt,
      truncated: answer.truncated,
      cardLink: cardLinkOf(String(body.collection || "blog"))
    });
    return true;
  }
  if (route === "/api/style/read") {
    const body = await readBody(request);
    sendJson(response, 200, readStyle(body.target || {}));
    return true;
  }
  if (route === "/api/style/save") {
    const body = await readBody(request);
    refuseWhenStale();
    sendJson(response, 200, saveInspectorChange(body));
    return true;
  }
  if (route === "/api/entry/draft") {
    const body = await readBody(request);
    refuseWhenStale();
    sendJson(response, 200, writeDraft(body));
    return true;
  }
  if (route === "/api/entry/create") {
    const body = await readBody(request);
    refuseWhenStale();
    sendJson(response, 200, createEntry(body));
    return true;
  }
  if (route === "/api/entry/trash") {
    const collection = url.searchParams.get("collection") || "";
    const slug = url.searchParams.get("slug") || "";
    sendJson(response, 200, trashEntry(collection, slug));
    return true;
  }
  if (route === "/api/entry/restore") {
    const collection = url.searchParams.get("collection") || "";
    const slug = url.searchParams.get("slug") || "";
    sendJson(response, 200, restoreEntry(collection, slug));
    return true;
  }
  if (route === "/api/deploy") {
    await handleDeploy(request, response);
    return true;
  }
  return false;
}

// The panel refuses to write while the build is older than the sources.
function refuseWhenStale() {
  const stamp = buildStamp();
  if (stamp.stale) {
    fail(STALE_MESSAGE);
  }
}

const server = http.createServer(function (request, response) {
  const url = new URL(request.url || "/", "http://" + HOST + ":" + String(PORT));
  void handleApi(request, response, url).then(function (handled) {
    if (handled) {
      return;
    }
    if (url.pathname === "/admin") {
      response.writeHead(302, { Location: "/admin/" });
      response.end();
      return;
    }
    if (url.pathname.startsWith("/admin/")) {
      const relative = url.pathname.slice("/admin/".length);
      const target = resolveInside(PANEL_DIR, relative === "" ? "index.html" : relative);
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      serveStatic(response, target);
      return;
    }
    serveSite(response, url.pathname);
  }).catch(function (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (response.headersSent) {
      response.end();
      return;
    }
    sendJson(response, 400, { ok: false, error: message });
  });
});

function shutdown() {
  try {
    server.close();
  } catch (err) {
    void err;
  }
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  process.exit(0);
}

process.on("exit", function () {
  closeSession();
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (process.env.ADMIN_SHUTDOWN_ON_STDIN === "1" && process.stdin.isTTY !== true) {
  process.stdin.resume();
  process.stdin.on("end", shutdown);
}

server.listen(PORT, HOST, function () {
  console.log("The control panel is on http://" + HOST + ":" + String(PORT) + "/admin/");
});
