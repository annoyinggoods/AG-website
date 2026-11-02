import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { inspectStylesheet, findRuleLoss } from "./css-rules.mjs";
import { validatePageHtml } from "./html-rules.mjs";
import { checkImages } from "./image-rules.mjs";
import { loadEntries, COLLECTIONS, indexSectionHtml, pageHtml } from "./entries.mjs";
import { readProducts, productsSectionHtml } from "./registry.mjs";
import { buildNagBundle } from "./bundle-nag.mjs";
import { buildNagStandalone } from "./bundle-nag-standalone.mjs";
import { buildNagPackage } from "./package-nag.mjs";
import { buildDraghtsBundle } from "./bundle-draghts.mjs";
import { buildDraghtsStandalone } from "./bundle-draghts-standalone.mjs";
import { buildDraghtsPackage } from "./package-draghts.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const MENU_TREE_PATH = path.join(ROOT, "tools", "menu.tree.json");
const PAGE_META_PATH = path.join(ROOT, "tools", "build", "page-meta.json");
const SITE_CONFIG_PATH = path.join(ROOT, "tools", "build", "site.config.json");
const CONTENT_DIR = path.join(ROOT, "tools", "build", "content");
const PARTIALS_DIR = path.join(ROOT, "tools", "partials");
const EVENTS_DIR = path.join(ROOT, "styles", "events");
const EVENT_ASSETS_DIR = path.join(ROOT, "assets", "events");
const OUT_DIR = ROOT;

const SITE_NAME = "Annoying Goods";
const DESCRIPTION_MIN = 150;
const DESCRIPTION_MAX = 160;
const HTACCESS_PATH = path.join(ROOT, ".htaccess");
const CSP_HASH_PLACEHOLDER = "__AG_INLINE_SCRIPT_HASH__";
const CONSENT_STORAGE_KEY = "ag-cookie-consent";
const CONSENT_VERSION = 1;

// Runs before the first paint: it marks the document as scripted, restores the
// stored theme, and hides the cookie banner when a consent record already
// exists. The content security policy hashes this exact string.
const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var raw=localStorage.getItem("${CONSENT_STORAGE_KEY}");if(raw){var choice="";var version=${CONSENT_VERSION};try{var rec=JSON.parse(raw);if(rec&&typeof rec==="object"){choice=String(rec.choice||"");version=rec.version;}}catch(e){choice=String(raw).replace(/^"|"$/g,"");version=${CONSENT_VERSION};}if((choice==="accepted"||choice==="declined")&&version===${CONSENT_VERSION}){d.setAttribute("data-cookie","set");}}}catch(e){}try{var k="ag-theme";var saved=localStorage.getItem(k);var theme="dark";if(saved){try{var p=JSON.parse(saved);if(p&&typeof p==="object"&&(p.theme==="light"||p.theme==="dark")){theme=p.theme;}}catch(e2){var t=String(saved).replace(/^"|"$/g,"");if(t==="light"||t==="dark"){theme=t;}}}else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches){theme="light";}d.setAttribute("data-theme",theme);var m=document.querySelector("meta[name='theme-color']:not([media])");if(m){m.content=theme==="dark"?"#0e0817":"#efeaf8";}}catch(e3){}})();`;

const FONT_PRELOADS = [
  "/assets/fonts/Fiendish.woff2",
  "/assets/fonts/MavenPro-Medium.woff2",
  "/assets/fonts/MavenPro-Regular.woff2"
];

const FLAT_TO_CANON = {
  "index.html": "/",
  "about.html": "/about/",
  "agit.html": "/products/agit/",
  "products.html": "/products/",
  "labs.html": "/labs/",
  "blog.html": "/blog/",
  "words.html": "/words/",
  "support.html": "/support/",
  "contact.html": "/contact/",
  "404.html": "/404.html"
};

function fail(message) {
  console.error("BUILD ERROR: " + message);
  process.exit(1);
}

function readFile(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (err) {
    void err;
    return "";
  }
}

function writeFile(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  writeFileWithRetry(p, data);
}

// Windows can hold a file for a moment while the preview, the test server or
// another build reads it, so a write waits a little and tries again. The
// panel rebuilds in the background, so two writes can meet on the same file.
function writeFileWithRetry(p, data) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.writeFileSync(p, data);
      return;
    } catch (err) {
      if (attempt === 9) {
        throw err;
      }
      pauseSync(50);
    }
  }
}

function pauseSync(milliseconds) {
  const buffer = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buffer, 0, 0, milliseconds);
}

function escapeHtml(raw) {
  return String(raw).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJson(raw) {
  return JSON.stringify(raw).replace(/</g, "\\u003c");
}

function slugFor(node) {
  const p = node.path === "/" ? "" : node.path.replace(/^\/+/, "").replace(/\/+$/, "");
  return p.length === 0 ? "index" : p.replace(/\//g, "-");
}

function outputFile(node) {
  if (node.path === "/") return "index.html";
  const p = node.path.replace(/^\/+/, "").replace(/\/+$/, "");
  return p + "/index.html";
}

function canonicalUrl(node) {
  return SITE_DOMAIN + node.path;
}

function linkFor(node) {
  return node.path;
}

// Flatten the tree into nodes with path, title, parent, depth, keywords, children
function flatten(nodes, inheritedParent) {
  const out = [];
  for (let i = 0; i < nodes.length; i = i + 1) {
    const node = nodes[i];
    if (!node) continue;
    const entry = {
      path: node.path,
      title: node.title,
      parent: node.parent === undefined || node.parent === null ? inheritedParent : node.parent,
      depth: node.depth === undefined ? 0 : node.depth,
      keywords: Array.isArray(node.keywords) ? node.keywords.slice() : [],
      children: Array.isArray(node.children) ? node.children : []
    };
    out.push(entry);
    if (entry.children.length > 0) {
      out.push.apply(out, flatten(entry.children, entry.path));
    }
  }
  return out;
}

const treeRaw = readFile(MENU_TREE_PATH);
if (!treeRaw) {
  fail("tools/menu.tree.json is missing. The menu tree is the single source for nav, search and the sitemap.");
}
let tree;
try {
  tree = JSON.parse(treeRaw);
} catch (err) {
  fail("tools/menu.tree.json is not valid JSON: " + String(err && err.message ? err.message : err));
}
if (!tree || !Array.isArray(tree.pages)) {
  fail("tools/menu.tree.json must contain a top-level \"pages\" array.");
}
const nodes = flatten(tree.pages, null);
if (nodes.length === 0) {
  fail("tools/menu.tree.json contains no pages.");
}

const metaRaw = readFile(PAGE_META_PATH);
if (!metaRaw) {
  fail("tools/build/page-meta.json is missing. Every page needs a title and a 150 to 160 character description.");
}
let pageMeta;
try {
  pageMeta = JSON.parse(metaRaw);
} catch (err) {
  fail("tools/build/page-meta.json is not valid JSON: " + String(err && err.message ? err.message : err));
}
if (!pageMeta || typeof pageMeta !== "object") {
  fail("tools/build/page-meta.json must contain an object keyed by page path.");
}

// The site configuration holds the domain, the base path and the live event.
// The event is a name, never a rule: the build looks the pack up and refuses
// to write a page when the pack is not on disk.
const siteConfigRaw = readFile(SITE_CONFIG_PATH);
if (!siteConfigRaw) {
  fail("tools/build/site.config.json is missing. It holds the domain, the base path and the live event.");
}
let siteConfig;
try {
  siteConfig = JSON.parse(siteConfigRaw);
} catch (err) {
  fail("tools/build/site.config.json is not valid JSON: " + String(err && err.message ? err.message : err));
}
if (!siteConfig || typeof siteConfig !== "object") {
  fail("tools/build/site.config.json must contain an object.");
}

const SITE_DOMAIN = String(siteConfig.domain || "https://annoyinggoods.com");
// Set to "/annoyinggoods" when the site is served from a sub-folder instead of the domain root.
const BASE_PATH = String(siteConfig.basePath || "");
const EVENT_NAME = String(siteConfig.event || "normal");
const KNOWN_EVENTS = Array.isArray(siteConfig.events) ? siteConfig.events.map(String) : [];

function validateEventPack(name) {
  if (KNOWN_EVENTS.length > 0 && KNOWN_EVENTS.indexOf(name) === -1) {
    fail("The event " + name + " is not listed in tools/build/site.config.json. Known events: " + KNOWN_EVENTS.join(", ") + ".");
  }
  const stylesheet = path.join(EVENTS_DIR, "event-" + name + ".css");
  if (!fs.existsSync(stylesheet)) {
    fail("The event " + name + " has no stylesheet. Expected " + path.relative(ROOT, stylesheet) + ".");
  }
  const assets = path.join(EVENT_ASSETS_DIR, name);
  if (!fs.existsSync(assets)) {
    fail("The event " + name + " has no asset folder. Expected " + path.relative(ROOT, assets) + ".");
  }
}

validateEventPack(EVENT_NAME);

// Read shared chrome partials
const headLinks = readFile(path.join(PARTIALS_DIR, "head-links.html"));
const sprite = readFile(path.join(PARTIALS_DIR, "sprite.svg"));
const cookieBanner = readFile(path.join(PARTIALS_DIR, "cookie-banner.html"));
const menuBubble = readFile(path.join(PARTIALS_DIR, "menu-bubble.html"));
const lightbox = readFile(path.join(PARTIALS_DIR, "lightbox.html"));
if (!headLinks || !sprite || !cookieBanner || !menuBubble || !lightbox) {
  fail("One or more shared partials in tools/partials/ are missing or empty.");
}

// Bundle the stylesheets into one minified file and the module graph into one
// deferred script. The chart module stays a separate lazily loaded module.
function styleHrefs() {
  const hrefs = [];
  const re = /<link\s+rel="stylesheet"\s+href="([^"]+)"/g;
  let match = re.exec(headLinks);
  while (match !== null) {
    hrefs.push(match[1]);
    match = re.exec(headLinks);
  }
  if (hrefs.length === 0) {
    fail("tools/partials/head-links.html does not list any stylesheets.");
  }
  return hrefs;
}

function minifyCss(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") {
          j = j + 2;
          continue;
        }
        if (source[j] === ch) {
          j = j + 1;
          break;
        }
        j = j + 1;
      }
      out += source.slice(i, j);
      i = j;
      continue;
    }
    out += ch;
    i = i + 1;
  }
  out = out.replace(/\s+/g, " ");
  out = out.replace(/\s*([{};,])\s*/g, "$1");
  out = out.replace(/:\s+/g, ":");
  out = out.replace(/;}/g, "}");
  out = out.replace(/\s*,\s*/g, ",");
  return out.trim();
}

function buildStyleBundle() {
  const hrefs = styleHrefs();
  const parts = [];
  const sources = [];
  for (let i = 0; i < hrefs.length; i += 1) {
    const href = hrefs[i];
    const file = path.join(ROOT, href.replace(/^\//, ""));
    const source = readFile(file);
    if (!source) {
      fail("The stylesheet " + href + " is missing or empty.");
    }
    const inspection = inspectStylesheet(source);
    if (inspection.errors.length > 0) {
      fail("The stylesheet " + href + " has a parse error and loses " + String(inspection.authoredRules - inspection.parsedRules) + " rule(s): " + inspection.errors[0]);
    }
    if (inspection.parsedRules < inspection.authoredRules) {
      fail("The stylesheet " + href + " loses " + String(inspection.authoredRules - inspection.parsedRules) + " rule(s) to a parse error.");
    }
    sources.push({ name: href, authoredRules: inspection.authoredRules });
    parts.push(source);
  }
  const minified = minifyCss(parts.join("\n"));
  const bundlePath = path.join(ROOT, "styles", "bundle.min.css");
  const previousBundle = readFile(bundlePath);
  writeFile(bundlePath, minified);
  const bundle = inspectStylesheet(minified);
  const loss = findRuleLoss(sources, bundle);
  if (loss) {
    if (previousBundle) {
      writeFile(bundlePath, previousBundle);
    }
    fail(loss);
  }
  return minified.length;
}

function scriptModules() {
  const dir = path.join(ROOT, "scripts");
  const names = fs.readdirSync(dir).filter(function (name) {
    return name.endsWith(".js") && name !== "bundle.js";
  });
  const sources = new Map();
  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    sources.set(name, readFile(path.join(dir, name)));
  }
  return sources;
}

function buildScriptBundle() {
  const sources = scriptModules();
  if (!sources.has("main.js")) {
    fail("scripts/main.js is missing. Run the TypeScript build first.");
  }
  const order = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(name) {
    if (visited.has(name)) {
      return;
    }
    if (visiting.has(name)) {
      fail("The script module graph has a cycle at " + name + ".");
    }
    const source = sources.get(name);
    if (source === undefined) {
      fail("The script module " + name + " is missing from scripts/.");
    }
    visiting.add(name);
    const re = /from\s+["']\.\/([^"']+)["']/g;
    let match = re.exec(source);
    while (match !== null) {
      visit(match[1]);
      match = re.exec(source);
    }
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }
  visit("main.js");
  const parts = [];
  const declared = new Map();
  for (let i = 0; i < order.length; i += 1) {
    const name = order[i];
    let source = sources.get(name) || "";
    source = source.replace(/^import\s+[^;]+;\s*$/gm, "");
    source = source.replace(/^export\s+\{/gm, "/* exported */ {");
    source = source.replace(/^export\s+(?=(async\s+)?(function|const|let|var|class)\s)/gm, "");
    const nameRe = /^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
    let match = nameRe.exec(source);
    while (match !== null) {
      const symbol = match[1];
      if (declared.has(symbol)) {
        fail("The modules " + declared.get(symbol) + " and " + name + " both declare " + symbol + ". Rename one of them before bundling.");
      }
      declared.set(symbol, name);
      match = nameRe.exec(source);
    }
    parts.push("// " + name + "\n" + source.replace(/\/\/# sourceMappingURL=.*$/gm, ""));
  }
  const bundle = parts.join("\n");
  writeFile(path.join(ROOT, "scripts", "bundle.js"), bundle);
  return bundle.length;
}

const styleBundleSize = buildStyleBundle();
const scriptBundleSize = buildScriptBundle();
// The game is its own bundle, so the page loads one file for it instead of
// one file per module.
const nagBundleSize = buildNagBundle();
// The downloadable copy is a plain script, because a browser will not load a
// module from a file:// URL and the archive has to open with a double click.
const nagStandaloneSize = buildNagStandalone();
// The downloadable copy of the game is the same game, packed into an archive
// a visitor can unpack and open without a website in front of it.
const nagPackage = buildNagPackage();
// The drAGhts game is its own bundle too: one request for the slot page.
// The standalone copy and the archive mirror the nAG lines above, so the
// download can never drift from the page.
const draghtsBundleSize = buildDraghtsBundle();
const draghtsStandaloneSize = buildDraghtsStandalone();
const draghtsPackage = buildDraghtsPackage();

// Root-absolute asset/style URLs so nested folder pages resolve subresources
function rootAbsoluteAssets(html) {
  let out = String(html);
  out = out.replace(/(href|src)="assets\//g, '$1="' + BASE_PATH + "/assets/");
  out = out.replace(/href="styles\//g, 'href="' + BASE_PATH + '/styles/');
  out = out.replace(/src="scripts\/main\.js"/g, 'src="' + BASE_PATH + '/scripts/bundle.js"');
  return out;
}

// Rewrite legacy flat-file links (about.html, agit.html, ...) to canonical paths
function rewriteFlatLinks(html) {
  let out = String(html);
  for (const [flat, canon] of Object.entries(FLAT_TO_CANON)) {
    const esc = flat.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp('href="' + esc + '(#[^"]*)?"', "g"), function (m, anchor) {
      return 'href="' + canon + (anchor || "") + '"';
    });
  }
  return out;
}

function metaFor(node) {
  if (node.isEntry) {
    return { description: node.entry.description, docTitle: null, lang: "en" };
  }
  const entry = pageMeta[node.path];
  if (!entry || typeof entry !== "object") {
    fail("tools/build/page-meta.json has no entry for " + node.path + ". Every page needs a description.");
  }
  const description = String(entry.description || "");
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    fail("The description for " + node.path + " is " + description.length + " characters. It must be " + DESCRIPTION_MIN + " to " + DESCRIPTION_MAX + ".");
  }
  const lang = entry.lang ? String(entry.lang) : "en";
  // An optional layout name switches the page chrome: "playground" drops the
  // glass stage, parks the hero and menu on the left and stills every animation.
  const layout = entry.layout ? String(entry.layout) : "";
  return { description: description, docTitle: entry.title ? String(entry.title) : null, lang: lang, layout: layout };
}

// Content fragments are mandatory: an empty page must never ship
function contentFor(node) {
  if (node.isEntry) {
    return pageHtml(node.entry);
  }
  const file = path.join(CONTENT_DIR, slugFor(node) + ".html");
  const content = readFile(file);
  if (!content.trim()) {
    fail("Missing or empty content fragment for " + node.path + " (expected " + path.relative(ROOT, file) + ").");
  }
  return fillPlaceholders(content + collectionSection(node));
}

// The download page carries the size and the checksum of the archive, and
// both change every time the game is rebuilt. They are placeholders in the
// content fragment and the build fills them in, so the page can never quote
// a checksum that does not match the file beside it.
const PLACEHOLDERS = {
  "{{nag_version}}": () => nagPackage.version,
  "{{nag_size}}": () => nagPackage.humanSize,
  "{{nag_bytes}}": () => String(nagPackage.bytes),
  "{{nag_sha256}}": () => nagPackage.sha256,
  "{{nag_file}}": () => "nag-" + nagPackage.version + ".zip",
  "{{draghts_version}}": () => draghtsPackage.version,
  "{{draghts_size}}": () => draghtsPackage.humanSize,
  "{{draghts_bytes}}": () => String(draghtsPackage.bytes),
  "{{draghts_sha256}}": () => draghtsPackage.sha256,
  "{{draghts_file}}": () => "draghts-" + draghtsPackage.version + ".zip",
};

function fillPlaceholders(html) {
  let out = html;
  for (const [name, value] of Object.entries(PLACEHOLDERS)) {
    out = out.split(name).join(value());
  }
  return out;
}

// The collection index page carries the generated entry cards, so a new
// markdown source reaches the index without anybody editing the page.
function collectionSection(node) {
  if (node.path === "/products/") {
    return productsSectionHtml(products);
  }
  for (let i = 0; i < COLLECTIONS.length; i += 1) {
    const collection = COLLECTIONS[i];
    if (collection.indexPath !== node.path) {
      continue;
    }
    const list = entriesByCollection.get(collection.id) || [];
    return indexSectionHtml(collection, list);
  }
  return "";
}

function contentModified(node) {
  if (node.isEntry) {
    try {
      return fs.statSync(path.join(ROOT, node.entry.sourceFile)).mtime;
    } catch (err) {
      void err;
      return new Date();
    }
  }
  const file = path.join(CONTENT_DIR, slugFor(node) + ".html");
  try {
    return fs.statSync(file).mtime;
  } catch (err) {
    void err;
    return new Date();
  }
}

// Hero strip content: full animation on the home page, resting web + parked ball on
// section pages, and a fully static ball on layout pages that allow no animation.
function heroHtml(node, isStatic) {
  const root = BASE_PATH + "/";
  if (isStatic) {
    return `<section class="hero" data-admin="hero:hero.css" data-hero-static>
<img class="hero-fallback" src="${root}assets/hero/ball.webp" alt="Resting spider ball of the Annoying Goods studio" width="1050" height="780">
</section>`;
  }
  const isHome = node.path === "/";
  const aria = isHome ? "Animated spider weaving a web above the Annoying Goods studio" : "Resting spider ball";
  const full = isHome
    ? ' data-hero-anim data-hero-anim-full aria-label="Spider hero animation"'
    : ' data-hero-anim aria-label="Spider hero resting state"';
  const prompt = isHome
    ? '<p class="hero-prompt">The spider is ready to weave.</p><button class="hero-start" type="button" data-hero-start>Click to start the weaving</button>'
    : "";
  return `<section class="hero" data-admin="hero:hero.css"${full}>
<div class="hero-stage" id="hero-stage" role="img" aria-label="${aria}">
<img class="hero-fallback" src="${root}assets/hero/ball.webp" alt="Resting spider ball of the Annoying Goods studio" width="1050" height="780">
</div>
${prompt}
<noscript>
<p class="hero-noscript">The full weaving animation needs JavaScript, so here is the resting spider ball instead.</p>
<img class="hero-noscript-image" src="${root}assets/hero/ball.webp" alt="Resting spider ball of the Annoying Goods studio" width="1050" height="780">
</noscript>
</section>`;
}

// Generate recursive nav markup from the tree (single source of truth)
function buildNavItem(node, currentPath) {
  const href = linkFor(node);
  const hasChildren = node.children.length > 0;
  const isCurrent = node.path === currentPath;
  const current = isCurrent ? ' aria-current="page"' : "";
  const lead = isCurrent
    ? '<svg class="menu-arrow" aria-hidden="true"><use href="#icon-arrow-right"></use></svg>'
    : "";
  const tail = isCurrent
    ? '<svg class="menu-arrow" aria-hidden="true"><use href="#icon-arrow-left"></use></svg>'
    : '<svg class="menu-arrow" aria-hidden="true"><use href="#icon-arrow-right"></use></svg>';
  const link = '<a class="menu-link" href="' + href + '" data-menu-item="' + escapeHtml(node.path) + '"' + current + '>' + lead + escapeHtml(node.title) + tail + "</a>";
  const heading = '<span class="menu-heading">' + link + "</span>";
  let inner = heading;
  if (hasChildren) {
    inner = '<details class="menu-details"><summary class="menu-summary">' + heading + "</summary><ul class=\"menu-list\">" + node.children.map(function (child) {
      return buildNavItem(child, currentPath);
    }).join("") + "</ul></details>";
  }
  return '<li class="menu-item" data-menu-path="' + escapeHtml(node.path) + '">' + inner + "</li>";
}

function buildNav(currentPath) {
  const roots = nodes.filter(function (node) { return node.parent === null; });
  const items = roots.map(function (node) { return buildNavItem(node, currentPath); }).join("");
  const pill = `<div class="menu-theme-pill" role="group" aria-label="Theme">
<button class="theme-pill-segment" type="button" data-theme-choice="dark" aria-pressed="true"><svg class="theme-pill-icon" aria-hidden="true" focusable="false"><use href="#icon-moon"></use></svg><span class="theme-pill-label">dark theme</span></button>
<button class="theme-pill-segment" type="button" data-theme-choice="light" aria-pressed="false"><svg class="theme-pill-icon" aria-hidden="true" focusable="false"><use href="#icon-knife"></use></svg><span class="theme-pill-label">light theme</span></button>
<svg class="theme-pill-hint" aria-hidden="true" focusable="false"><use href="#icon-pentagram"></use></svg>
</div>
<span class="theme-status" data-theme-status role="status" aria-live="polite" hidden></span>`;
  return `<nav class="menu-box" id="site-menu" aria-label="Site menu" data-menu data-menu-panel data-admin="menu:menu.css">
<div class="menu-search">
<label class="menu-search-label" for="menu-search-input">Search pages</label>
<input class="menu-search-input" type="search" id="menu-search-input" name="q" data-menu-search autocomplete="off" placeholder="Search pages…"><button class="menu-search-clear" type="button" data-menu-search-clear aria-label="Clear search" hidden>Clear</button>
</div>
<div class="menu-search-results" data-menu-results role="listbox" aria-label="Page search results" hidden></div>
<p class="menu-search-status" data-menu-search-status role="status" aria-live="polite" hidden></p>
<ul class="menu-list" data-menu-tree>` + items + `</ul>` + pill + `
</nav>`;
}

// Excerpt: strip tags, trim, cap length
function excerpt(html) {
  const text = String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 200 ? text.slice(0, 200).trim() + "…" : text;
}

// Build search index
const nodeByPath = {};
for (let i = 0; i < nodes.length; i += 1) {
  nodeByPath[nodes[i].path] = nodes[i];
}

// The entry pipeline turns the markdown sources into detail pages. An entry is
// not a branch of the navigation, so it gets a node of its own that never
// reaches the menu, but it does reach the index, the search and the sitemap.
const entries = loadEntries(ROOT);
const entriesByCollection = new Map();
for (let i = 0; i < entries.length; i += 1) {
  const entry = entries[i];
  const collection = COLLECTIONS.find(function (item) { return item.id === entry.collection; });
  if (!collection) {
    fail("The entry " + entry.sourceFile + " belongs to an unknown collection.");
  }
  const parent = nodeByPath[collection.indexPath];
  if (!parent) {
    fail("The collection " + collection.id + " has no index page at " + collection.indexPath + ".");
  }
  const node = {
    path: entry.path,
    title: entry.title,
    parent: parent.path,
    depth: parent.depth + 1,
    keywords: entry.keywords,
    children: [],
    isEntry: true,
    entry: entry
  };
  nodeByPath[node.path] = node;
  const list = entriesByCollection.get(collection.id) || [];
  list.push(entry);
  entriesByCollection.set(collection.id, list);
}

const entryNodes = entries.map(function (entry) {
  return nodeByPath[entry.path];
});
const allNodes = nodes.concat(entryNodes);

// The product registry drives the listing on the products index page.
const products = readProducts(ROOT, tree, nodeByPath, CONTENT_DIR, slugFor);

// Build search index
const searchIndex = allNodes.map(function (node) {
  const content = node.isEntry ? node.entry.bodyHtml : readFile(path.join(CONTENT_DIR, slugFor(node) + ".html"));
  return {
    title: node.title,
    path: node.path,
    parent: node.parent,
    keywords: node.keywords,
    excerpt: excerpt(content)
  };
});


// Breadcrumb trail from the tree: every ancestor prefix is a real node
function breadcrumbTrail(node) {
  const trail = [];
  const segments = node.path.split("/").filter(function (part) { return part.length > 0; });
  let prefix = "/";
  trail.push(nodeByPath["/"] || { path: "/", title: "Home" });
  for (let i = 0; i < segments.length; i += 1) {
    prefix += segments[i] + "/";
    const found = nodeByPath[prefix];
    if (found) {
      trail.push(found);
    }
  }
  return trail;
}

function breadcrumbSchema(node) {
  const trail = breadcrumbTrail(node);
  const items = trail.map(function (entry, index) {
    return {
      "@type": "ListItem",
      position: index + 1,
      name: entry.title,
      item: SITE_DOMAIN + entry.path
    };
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

function websiteSchema(meta) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": SITE_DOMAIN + "/#website",
        name: SITE_NAME,
        url: SITE_DOMAIN + "/",
        description: meta.description,
        inLanguage: "en",
        publisher: { "@id": SITE_DOMAIN + "/#organization" }
      },
      {
        "@type": "Organization",
        "@id": SITE_DOMAIN + "/#organization",
        name: SITE_NAME,
        url: SITE_DOMAIN + "/",
        logo: {
          "@type": "ImageObject",
          url: SITE_DOMAIN + BASE_PATH + "/assets/spider-logo.webp"
        }
      }
    ]
  };
}

function documentTitle(node, meta) {
  if (meta.docTitle) {
    return meta.docTitle;
  }
  return node.title + " — " + SITE_NAME;
}

// Two pages may never share a document title, and every title must follow the
// "{Page} — Annoying Goods" pattern, so a search engine can tell the pages
// apart and the brand stays visible in the result list.
function validateTitles() {
  const seen = new Map();
  for (let i = 0; i < allNodes.length; i += 1) {
    const node = allNodes[i];
    const title = documentTitle(node, metaFor(node));
    if (title.trim().length === 0) {
      fail("The document title for " + node.path + " is empty.");
    }
    if (title.indexOf(SITE_NAME) === -1) {
      fail("The document title for " + node.path + " does not mention " + SITE_NAME + ": " + title);
    }
    const owner = seen.get(title);
    if (owner !== undefined) {
      fail("The pages " + owner + " and " + node.path + " share the document title " + JSON.stringify(title) + ". Give one of them its own title in tools/build/page-meta.json.");
    }
    seen.set(title, node.path);
  }
}

// The content security policy allows exactly one inline script: the pre-paint
// theme and consent snippet in the page head. The build hashes that snippet
// and writes the digest into the deployment rules, so the policy can never
// drift away from the script it protects.
function inlineScriptHash() {
  return crypto.createHash("sha256").update(THEME_SCRIPT, "utf8").digest("base64");
}

function writeCspHash() {
  const rules = readFile(HTACCESS_PATH);
  if (!rules) {
    fail("The deployment rules .htaccess are missing. The HTTPS redirect, the cache rules and the content security policy live there.");
  }
  const digest = inlineScriptHash();
  const pattern = /('sha256-)[A-Za-z0-9+/=]+/;
  if (pattern.test(rules)) {
    writeFile(HTACCESS_PATH, rules.replace(pattern, "$1" + digest));
    return;
  }
  if (rules.indexOf(CSP_HASH_PLACEHOLDER) === -1) {
    fail("The deployment rules .htaccess hold no script digest for the content security policy. The policy needs the digest of the inline script.");
  }
  writeFile(HTACCESS_PATH, rules.split(CSP_HASH_PLACEHOLDER).join(digest));
}

function headLinksWithBundle() {
  const withoutStyles = headLinks.replace(/<link\s+rel="stylesheet"[^>]*>\s*/g, "");
  return withoutStyles + '<link rel="stylesheet" href="' + BASE_PATH + '/styles/bundle.min.css">\n';
}

function headBlock(node, meta, title, options) {
  const image = SITE_DOMAIN + BASE_PATH + "/assets/spider-logo.webp";
  const schema = node.path === "/" ? websiteSchema(meta) : breadcrumbSchema(node);
  const lang = options && options.lang ? options.lang : "en";
  const robots = options && options.robots ? options.robots : "index,follow";
  const event = options && options.event ? options.event : EVENT_NAME;
  const canonical = options && options.canonical === false ? "" : '<link rel="canonical" href="' + canonicalUrl(node) + '">\n';
  const preloads = FONT_PRELOADS.map(function (href) {
    return '<link rel="preload" href="' + BASE_PATH + href + '" as="font" type="font/woff2" crossorigin>';
  }).concat([
    // The painted pattern is the plain web; the words layer only shows after
    // the weave, so the plain pair gets the early hint.
    '<link rel="preload" href="' + BASE_PATH + '/assets/hero/web-plain-dark.webp" as="image" media="(prefers-color-scheme: dark)">',
    '<link rel="preload" href="' + BASE_PATH + '/assets/hero/web-plain-light.webp" as="image" media="(prefers-color-scheme: light)">'
  ]).join("\n");
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" data-theme="dark" data-event="${escapeHtml(event)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0e0817">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0e0817">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#efeaf8">
<script>${THEME_SCRIPT}</script>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="robots" content="${escapeHtml(robots)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl(node)}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="The Annoying Goods studio spider logo">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:locale" content="${escapeHtml(lang)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="${BASE_PATH}/assets/icon-180.png" sizes="180x180" type="image/png">
<link rel="icon" href="${BASE_PATH}/assets/spider-logo.webp" type="image/webp">
<link rel="apple-touch-icon" href="${BASE_PATH}/assets/icon-180.png">
${canonical}${preloads}
${rootAbsoluteAssets(headLinksWithBundle())}
<script type="application/ld+json">${escapeJson(schema)}</script>
<script id="menu-tree-payload" type="application/json" data-menu-tree-payload>${JSON.stringify(menuPayload())}</script>
</head>`;
}

function titleLengthAttr(title) {
  const length = String(title).length;
  if (length <= 9) {
    return "short";
  }
  if (length <= 13) {
    return "medium";
  }
  if (length <= 20) {
    return "long";
  }
  return "xlong";
}

// The menu payload carries the page tree and the entry list. The entries are
// kept apart from the pages so a long blog never fills the navigation, but the
// menu search still finds every entry.
function menuPayload() {
  const entryList = entries.map(function (entry) {
    return {
      path: entry.path,
      title: entry.title,
      collection: entry.collection,
      parent: nodeByPath[entry.path] ? nodeByPath[entry.path].parent : null,
      date: entry.date,
      keywords: entry.keywords
    };
  });
  return {
    generatedFrom: tree.generatedFrom || "tools/menu.tree.json",
    pages: tree.pages,
    entries: entryList
  };
}

// Assemble one page
function assemblePage(node) {
  const content = contentFor(node);
  const meta = metaFor(node);
  const title = documentTitle(node, meta);
  const isPlayground = meta.layout === "playground";
  const stageClass = isPlayground ? "stage" : "glass-surface stage";
  const layoutAttr = isPlayground ? ' data-layout="playground"' : "";
  return headBlock(node, meta, title, { lang: meta.lang, event: isPlayground ? "normal" : EVENT_NAME }) + `
<body data-page="${node.path}"${layoutAttr} data-admin="tokens:tokens.css">
<a class="skip-link" href="#main-content">Skip to main content</a>
${sprite}
<div class="site-background" data-admin="layout:layout.css" aria-hidden="true"></div>
<div class="${stageClass}" data-admin="glass:glass.css">
<header class="stage-header">
<div class="hero-strip" data-hero-strip>${rootAbsoluteAssets(heroHtml(node, isPlayground))}</div>
<div class="title-box" data-title-box data-title-length="${titleLengthAttr(node.title)}" data-admin="boxes:boxes.css">
<h1 class="site-title">${escapeHtml(node.title)}</h1>
</div>
</header>
${buildNav(node.path)}
<main class="main-box" id="main-content" data-main-box data-admin="boxes:boxes.css">${rootAbsoluteAssets(rewriteFlatLinks(content))}</main>
${footerHtml()}
</div>
${cookieBanner}
${menuBubble}
${lightbox}
<p class="entry-status" data-entry-status role="status" aria-live="polite"></p>
<script type="module" src="${BASE_PATH}/scripts/bundle.js"></script>
</body>
</html>`;
}

// The cookie settings link points at the banner itself, so it still leads
// somewhere when scripting is off.
// The event mark sits inline in the copyright line, so it reads as part of
// the footer text instead of a floating ornament.
function footerHtml() {
  return `<footer class="site-footer" data-admin="content:content.css">
<p class="footer-note"><span class="event-mark" data-event-mark data-admin="events:events.css" aria-hidden="true"></span>Annoying Goods all rights reserved 2026.</p>
<p class="footer-note"><a href="#cookie-notice" data-cookie-settings>Cookie settings</a></p>
</footer>`;
}

// Assemble the 404 page is built from the same chrome so it works at every URL depth
function assembleErrorPage() {
  const content = readFile(path.join(CONTENT_DIR, "404.html"));
  if (!content.trim()) {
    fail("Missing or empty content fragment for the 404 page (expected tools/build/content/404.html).");
  }
  const meta = {
    description: "The web ends here. The Annoying Goods 404 page shows a lost spider and a few useful doors back to the blog, the labs, the home page and the bug form.",
    docTitle: "Page Not Found — " + SITE_NAME
  };
  const node = { path: "/404.html", title: "Lost Thread" };
  return headBlock(node, meta, meta.docTitle, { robots: "noindex,follow", canonical: false }) + `
<body data-page="/404.html" data-admin="tokens:tokens.css">
<a class="skip-link" href="#main-content">Skip to main content</a>
${sprite}
<div class="site-background" data-admin="layout:layout.css" aria-hidden="true"></div>
<div class="glass-surface stage" data-admin="glass:glass.css">
<header class="stage-header">
<div class="hero-strip" data-hero-strip></div>
<div class="title-box" data-title-box data-title-length="${titleLengthAttr(node.title)}" data-admin="boxes:boxes.css">
<h1 class="site-title">${escapeHtml(node.title)}</h1>
</div>
</header>
${buildNav("/404.html")}
<main class="main-box" id="main-content" data-main-box data-admin="boxes:boxes.css">${rootAbsoluteAssets(rewriteFlatLinks(content))}</main>
${footerHtml()}
</div>
${cookieBanner}
${menuBubble}
${lightbox}
<p class="entry-status" data-entry-status role="status" aria-live="polite"></p>
<script type="module" src="${BASE_PATH}/scripts/bundle.js"></script>
</body>
</html>`;
}

// Validate internal hrefs, anchors and static assets across all written pages
function validate() {
  const errors = [];
  const written = {};
  for (let i = 0; i < allNodes.length; i += 1) {
    written[allNodes[i].path] = readFile(path.join(OUT_DIR, outputFile(allNodes[i])));
  }
  written["/404.html"] = readFile(path.join(OUT_DIR, "404.html"));
  // The structure check runs on every written page, including the error page.
  for (let i = 0; i < allNodes.length; i += 1) {
    const node = allNodes[i];
    const problems = validatePageHtml(written[node.path], node.path);
    for (let j = 0; j < problems.length; j += 1) {
      errors.push(problems[j]);
    }
  }
  const errorPageProblems = validatePageHtml(written["/404.html"], "/404.html");
  for (let i = 0; i < errorPageProblems.length; i += 1) {
    errors.push(errorPageProblems[i]);
  }
  function targetFile(href) {
    const noHash = href.split("#")[0];
    let p = noHash;
    if (p.length === 0) p = "/";
    if (!p.endsWith("/")) p = p + "/";
    return path.join(OUT_DIR, p.replace(/^\//, ""), "index.html");
  }
  function anchorId(href) {
    const parts = href.split("#");
    return parts.length > 1 ? parts[1] : null;
  }
  function hasAnchor(html, id) {
    return id ? new RegExp('id=\\x22' + id.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + "\\x22", "i").test(html) : true;
  }
  const STATIC_RE = /^\/(styles|assets|scripts|images|fonts|wasm|api)\//i;
  const STATIC_EXT = /\.(css|js|mjs|png|webp|jpg|jpeg|ico|svg|woff2?|ttf|eot|wasm|xml|txt|json|exe|tar|gz|zip|7z)(\?|#|$)/i;
  const hrefRe = /href=\x22([^\"]*)\x22/g;
  const srcRe = /src=\x22([^\"]*)\x22/g;
  for (let i = 0; i < allNodes.length; i += 1) {
    const node = allNodes[i];
    const html = written[node.path];
    let m;
    hrefRe.lastIndex = 0;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1];
      if (!href) continue;
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("data:")) continue;
      if (href.startsWith("#")) {
        const id = href.slice(1);
        if (id && !hasAnchor(html, id)) {
          errors.push("missing anchor " + href + " (on " + node.path + ")");
        }
        continue;
      }
      if (STATIC_RE.test(href) || STATIC_EXT.test(href)) {
        const assetPath = path.join(OUT_DIR, href.split("#")[0].split("?")[0].replace(/^\//, ""));
        if (!fs.existsSync(assetPath)) {
          errors.push("missing static asset " + href + " (on " + node.path + ")");
        }
        continue;
      }
      const tf = targetFile(href);
      if (!fs.existsSync(tf)) {
        errors.push("missing target " + href + " -> " + tf + " (on " + node.path + ")");
        continue;
      }
      const id = anchorId(href);
      if (id) {
        const targetHtml = readFile(tf);
        if (!hasAnchor(targetHtml, id)) {
          errors.push("missing anchor #" + id + " for " + href + " (on " + node.path + ")");
        }
      }
    }
    srcRe.lastIndex = 0;
    while ((m = srcRe.exec(html)) !== null) {
      const src = m[1];
      if (!src) continue;
      if (src.startsWith("http") || src.startsWith("data:")) continue;
      if (!STATIC_RE.test(src) && !STATIC_EXT.test(src)) continue;
      const assetPath = path.join(OUT_DIR, src.split("#")[0].split("?")[0].replace(/^\//, ""));
      if (!fs.existsSync(assetPath)) {
        errors.push("missing static asset " + src + " (on " + node.path + ")");
      }
    }
  }
  if (errors.length > 0) {
    errors.forEach(function (e) { console.error("BUILD VALIDATION ERROR: " + e); });
    process.exit(1);
  }
}

// The image gate runs before the pages are written, so a picture with the
// wrong format or a wrong declared size stops the build with a named error.
function validateImages() {
  const problems = checkImages(ROOT);
  if (problems.length === 0) {
    return;
  }
  for (let i = 0; i < problems.length; i += 1) {
    console.error("BUILD IMAGE ERROR: " + problems[i]);
  }
  fail(String(problems.length) + " image problems were found. The list is above.");
}

// The entry pages are the only pages this build can stop generating, because
// an entry can be moved to the trash. A folder under a collection index that
// the tree does not name, that this run did not write and that carries the
// marker of a generated entry page is left over from a removed entry, so it
// is taken away. A folder without that marker is never touched, so a
// hand-written page can never be removed by mistake.
const ENTRY_PAGE_MARKER = 'id="entry-heading-';

function pruneEntryPages() {
  const keep = new Set();
  for (let i = 0; i < allNodes.length; i += 1) {
    keep.add(path.join(OUT_DIR, outputFile(allNodes[i])));
  }
  const removed = [];
  for (let i = 0; i < COLLECTIONS.length; i += 1) {
    const folder = path.join(OUT_DIR, COLLECTIONS[i].indexPath.replace(/^\/+/, ""));
    if (!fs.existsSync(folder)) {
      continue;
    }
    for (const child of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!child.isDirectory()) {
        continue;
      }
      const target = path.join(folder, child.name);
      const page = path.join(target, "index.html");
      if (keep.has(page) || !fs.existsSync(page)) {
        continue;
      }
      if (readFile(page).indexOf(ENTRY_PAGE_MARKER) === -1) {
        continue;
      }
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(path.relative(ROOT, target).split(path.sep).join("/"));
    }
  }
  return removed;
}

// Write all pages
validateTitles();
validateImages();
let writtenCount = 0;
for (let i = 0; i < allNodes.length; i += 1) {
  const node = allNodes[i];
  const outPath = path.join(OUT_DIR, outputFile(node));
  writeFile(outPath, assemblePage(node));
  writtenCount = writtenCount + 1;
}
const removedPages = pruneEntryPages();
writeFile(path.join(OUT_DIR, "404.html"), assembleErrorPage());

// Search index
writeFile(path.join(OUT_DIR, "search-index.json"), JSON.stringify(searchIndex, null, 2));

// Sitemap
let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (let i = 0; i < allNodes.length; i += 1) {
  const node = allNodes[i];
  const modified = contentModified(node).toISOString().slice(0, 10);
  sm += "  <url><loc>" + canonicalUrl(node) + "</loc><lastmod>" + modified + "</lastmod></url>\n";
}
sm += "</urlset>\n";
writeFile(path.join(OUT_DIR, "sitemap.xml"), sm);

// robots.txt is generated so the sitemap URL can never drift from the domain
const robots = "User-agent: *\nAllow: /\n\nSitemap: " + SITE_DOMAIN + "/sitemap.xml\n";
writeFile(path.join(OUT_DIR, "robots.txt"), robots);

validate();
writeCspHash();

console.log("Build complete: " + writtenCount + " pages written plus 404.html.");
console.log("search-index.json: " + searchIndex.length + " entries.");
console.log("sitemap.xml: " + allNodes.length + " URLs.");
console.log("entries: " + entries.length + " markdown entries rendered.");
if (removedPages.length > 0) {
  console.log("removed entry pages: " + removedPages.join(", ") + ".");
}
console.log("styles/bundle.min.css: " + String(styleBundleSize) + " bytes.");
console.log("scripts/bundle.js: " + String(scriptBundleSize) + " bytes.");
console.log("scripts/nag/nag.bundle.js: " + String(nagBundleSize) + " bytes.");
console.log("scripts/draghts/draghts.bundle.js: " + String(draghtsBundleSize) + " bytes.");
