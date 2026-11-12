// Assembles the deployable dist/ directory from the built site.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { minifyJs, assertSameProgram } from "./minify-js.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const outArgument = readOutArgument();
const DIST_DIR = outArgument ? path.resolve(ROOT, outArgument) : path.join(ROOT, "dist");

// The top-level page directories are read from the menu tree rather than listed
// by hand: the list was hardcoded once, a new top-level page joined the tree,
// and its pages answered 404 on the packaged release while the live build was
// fine. The tree is the single source for nav, search and the sitemap; it is
// the single source for packaging too.
const MENU_TREE = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "menu.tree.json"), "utf8"));
const PAGE_DIRS = MENU_TREE.pages
    .map((node) => node.path === "/" ? null : node.path.replace(/^\/+/, "").replace(/\/+$/, ""))
    .filter((dirName) => dirName !== null && dirName.length > 0);
const ROOT_FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml", "search-index.json", ".htaccess", "release.json"];
const ASSET_DIRS = ["assets", "styles", "scripts"];
const API_DIR = "api";
const WASM_DIR = "wasm";
const WASM_PKG_DIR = "pkg";
const SNAPSHOT_DIR = "snapshots";

const EXCLUDED_NAMES = new Set([
    ".git",
    ".github",
    ".playwright-mcp",
    ".editorconfig",
    ".gitignore",
    "REVIEW",
    "dist",
    "node_modules",
    "playwright-report",
    "src",
    "test-results",
    "tools",
    "package-lock.json",
    "package.json",
    "playwright.config.ts",
    "tsconfig.json"
]);

const EXCLUDED_WASM_NAMES = new Set([
    ".gitignore",
    "Cargo.lock",
    "Cargo.toml",
    "src",
    "target",
    "tests"
]);

let fileCount = 0;
let byteCount = 0;
const skipped = [];

function fail(message) {
    console.error("PACKAGE ERROR: " + message);
    process.exit(1);
}

function copyFile(sourcePath, targetPath) {
    const stats = fs.statSync(sourcePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    fileCount = fileCount + 1;
    byteCount = byteCount + stats.size;
}

function copyTree(sourceDir, targetDir, skipNames) {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name;
        if (skipNames.has(name)) {
            continue;
        }
        if (name.endsWith(".map")) {
            continue;
        }
        const source = path.join(sourceDir, name);
        const target = path.join(targetDir, name);
        if (entry.isDirectory()) {
            copyTree(source, target, skipNames);
        } else if (entry.isFile()) {
            copyFile(source, target);
        }
    }
}

function copyDir(sourceDir, targetDir, skipNames) {
    if (!fs.existsSync(sourceDir)) {
        skipped.push(path.relative(ROOT, sourceDir));
        return;
    }
    copyTree(sourceDir, targetDir, skipNames);
}

function copyRootFile(fileName) {
    const source = path.join(ROOT, fileName);
    if (!fs.existsSync(source)) {
        skipped.push(fileName);
        return;
    }
    copyFile(source, path.join(DIST_DIR, fileName));
}

function humanSize(bytes) {
    const megabytes = bytes / (1024 * 1024);
    return megabytes.toFixed(2) + " MB";
}

// The target folder can be moved with --out, which the test suite uses to
// pack a release into a temporary folder instead of the live dist/.
function readOutArgument() {
    const index = process.argv.indexOf("--out");
    if (index === -1) {
        return "";
    }
    const value = process.argv[index + 1];
    if (!value) {
        fail("The --out option needs a folder name.");
    }
    return value;
}

const resolvedDist = path.resolve(DIST_DIR);
const relativeDist = path.relative(ROOT, resolvedDist);
const insideRoot = relativeDist.length > 0 && !relativeDist.startsWith("..") && !path.isAbsolute(relativeDist);
const isRepoRoot = resolvedDist === path.resolve(ROOT);
const isFileSystemRoot = path.dirname(resolvedDist) === resolvedDist;
if (isRepoRoot || isFileSystemRoot) {
    fail("Refusing to package: " + resolvedDist + " is not a folder that can be rebuilt.");
}
if (!outArgument && (!insideRoot || path.basename(resolvedDist) !== "dist")) {
    fail("Refusing to package: " + resolvedDist + " is not the dist directory inside " + ROOT + ".");
}

// The snapshot folder holds the copies of the last releases. The packaging
// wipes the dist folder, so the snapshots are moved aside before the wipe and
// moved back afterwards. Without this the next publish would delete the way
// back to a good release.
function stashSnapshots() {
    const source = path.join(resolvedDist, SNAPSHOT_DIR);
    if (!fs.existsSync(source)) {
        return "";
    }
    const stash = path.join(os.tmpdir(), "ag-snapshots-" + String(process.pid));
    fs.rmSync(stash, { recursive: true, force: true });
    try {
        fs.renameSync(source, stash);
    } catch (err) {
        fs.cpSync(source, stash, { recursive: true });
        fs.rmSync(source, { recursive: true, force: true });
    }
    return stash;
}

function restoreSnapshots(stash) {
    if (stash === "" || !fs.existsSync(stash)) {
        return;
    }
    const target = path.join(resolvedDist, SNAPSHOT_DIR);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(stash, target, { recursive: true });
    fs.rmSync(stash, { recursive: true, force: true });
}

const snapshotStash = stashSnapshots();
process.on("exit", function () {
    restoreSnapshots(snapshotStash);
});

fs.rmSync(resolvedDist, { recursive: true, force: true });
fs.mkdirSync(resolvedDist, { recursive: true });

for (const dirName of PAGE_DIRS) {
    copyDir(path.join(ROOT, dirName), path.join(DIST_DIR, dirName), EXCLUDED_NAMES);
}

for (const dirName of ASSET_DIRS) {
    copyDir(path.join(ROOT, dirName), path.join(DIST_DIR, dirName), EXCLUDED_NAMES);
}

copyDir(path.join(ROOT, API_DIR), path.join(DIST_DIR, API_DIR), EXCLUDED_NAMES);

const wasmPkgSource = path.join(ROOT, WASM_DIR, WASM_PKG_DIR);
if (fs.existsSync(wasmPkgSource)) {
    copyTree(wasmPkgSource, path.join(DIST_DIR, WASM_DIR, WASM_PKG_DIR), EXCLUDED_WASM_NAMES);
} else {
    skipped.push(path.join(WASM_DIR, WASM_PKG_DIR));
}

// The AGnosis playground's wasm: a staged static asset of its own folder,
// copied the same way. The folder is only there when the sibling project's
// bundle was staged, so a missing folder is a note, not a failure.
const wasmAgnosisSource = path.join(ROOT, WASM_DIR, "agnosis");
if (fs.existsSync(wasmAgnosisSource)) {
    copyTree(wasmAgnosisSource, path.join(DIST_DIR, WASM_DIR, "agnosis"), EXCLUDED_WASM_NAMES);
} else {
    skipped.push(path.join(WASM_DIR, "agnosis"));
}

for (const fileName of ROOT_FILES) {
    copyRootFile(fileName);
}

// The installer downloads the download page links to. Large binaries are
// never committed; the folder is assembled locally before packaging.
const downloadsSource = path.join(ROOT, "downloads");
if (fs.existsSync(downloadsSource)) {
    copyDir(downloadsSource, path.join(DIST_DIR, "downloads"), EXCLUDED_NAMES);
} else {
    skipped.push("downloads");
}

// The site loads one stylesheet and one script bundle. Both carry a content
// digest in the file name, so the browser can keep them for a year and a new
// release still reaches every visitor. The chart module is loaded on demand
// and is hashed for the same reason.
const CSS_BUNDLE = "bundle.min.css";
const JS_BUNDLE = "bundle.js";
const CHART_MODULE = "demo-chart.js";

function hashOf(content) {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex").slice(0, 10);
}

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
    fs.writeFileSync(filePath, content, "utf8");
}

function removeIfPresent(filePath) {
    if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
    }
}

function hashedName(name, hash) {
    const dot = name.indexOf(".");
    if (dot === -1) {
        return name + "." + hash;
    }
    return name.slice(0, dot) + "." + hash + name.slice(dot);
}

function emitHashed(relativePath, content) {
    const hash = hashOf(content);
    const name = hashedName(path.basename(relativePath), hash);
    const target = path.join(DIST_DIR, path.dirname(relativePath), name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    writeText(target, content);
    removeIfPresent(path.join(DIST_DIR, relativePath));
    return { hash: hash, name: name };
}

const cssSource = path.join(DIST_DIR, "styles", CSS_BUNDLE);
const chartSource = path.join(DIST_DIR, "scripts", CHART_MODULE);
const bundleSource = path.join(DIST_DIR, "scripts", JS_BUNDLE);

if (fs.existsSync(cssSource) && fs.existsSync(bundleSource)) {
    const chart = emitHashed("scripts/" + CHART_MODULE, readText(chartSource));
    let bundle = readText(bundleSource);
    bundle = bundle.split('import("./' + CHART_MODULE + '")').join('import("./' + chart.name + '")');
    // The script bundle is minified here, because the repository keeps the
    // readable bundle and only the release carries the small one.
    const minified = minifyJs(bundle);
    try {
        assertSameProgram(bundle, minified);
    } catch (err) {
        fail(String(err && err.message ? err.message : err));
    }
    const script = emitHashed("scripts/" + JS_BUNDLE, minified);
    const style = emitHashed("styles/" + CSS_BUNDLE, readText(cssSource));
    rewriteHtml(style, script);
    removeUnusedModules();
} else {
    console.log("Packaging note: the style or script bundle was missing, so no content hashed names were written.");
}

function rewriteHtml(style, script) {
    const stylePath = "/styles/" + style.name;
    const scriptPath = "/scripts/" + script.name;
    walkHtml(path.join(DIST_DIR), function (filePath) {
        let html = readText(filePath);
        html = html.split("/styles/" + CSS_BUNDLE).join(stylePath);
        html = html.split("/scripts/" + JS_BUNDLE).join(scriptPath);
        writeText(filePath, html);
    });
}

function walkHtml(directory, visit) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walkHtml(full, visit);
        } else if (entry.name.endsWith(".html")) {
            visit(full);
        }
    }
}

// The compiled module sources are build input, not site content. Only the
// bundle and the chart module are ever requested by a page.
function removeUnusedModules() {
    const scriptsDir = path.join(DIST_DIR, "scripts");
    if (!fs.existsSync(scriptsDir)) {
        return;
    }
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }
        if (!isShippedScript(entry.name)) {
            removeIfPresent(path.join(scriptsDir, entry.name));
        }
    }
}

function isShippedScript(name) {
    if (name === JS_BUNDLE || name === CHART_MODULE) {
        return true;
    }
    return /^(bundle|demo-chart)\.[0-9a-f]{10}\.js$/.test(name);
}

console.log("Packaged " + String(fileCount) + " files, " + String(byteCount) + " bytes (" + humanSize(byteCount) + ") into dist/.");
if (skipped.length > 0) {
    console.log("Skipped missing entries: " + skipped.join(", ") + ".");
}
restoreSnapshots(snapshotStash);
