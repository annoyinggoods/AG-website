import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = ROOT;
const MD_DIR = path.join(ROOT, "REVIEW", "md");
const MENU_PATH = path.join(ROOT, "tools", "menu.tree.json");
const PAGE_META_PATH = path.join(ROOT, "tools", "build", "page-meta.json");

const menuTree = JSON.parse(fs.readFileSync(MENU_PATH, "utf8"));
const pageMeta = JSON.parse(fs.readFileSync(PAGE_META_PATH, "utf8"));

function fail(message) {
  console.error("ERROR: " + message);
  process.exit(1);
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

// Flatten the menu tree into nodes {path, title, parent, depth}
function flatten(nodes, inheritedParent) {
  const out = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node) continue;
    const entry = {
      path: node.path,
      title: node.title,
      parent: node.parent === undefined || node.parent === null ? inheritedParent : node.parent,
      depth: node.depth === undefined ? 0 : node.depth,
      children: Array.isArray(node.children) ? node.children : []
    };
    out.push(entry);
    if (entry.children.length > 0) {
      out.push.apply(out, flatten(entry.children, entry.path));
    }
  }
  return out;
}

const nodes = flatten(menuTree.pages, null);
const nodeByPath = {};
for (let i = 0; i < nodes.length; i += 1) {
  nodeByPath[nodes[i].path] = nodes[i];
}

function outputFile(node) {
  if (node.path === "/") return "index.html";
  const p = node.path.replace(/^\/+/, "").replace(/\/+$/, "");
  return p + "/index.html";
}

// All pages we document: menu tree nodes, entry pages (blog/words), and the 404 error page
function allDocumentPages() {
  const pages = [];
  for (let i = 0; i < nodes.length; i += 1) {
    pages.push(nodes[i]);
  }
  // Entry pages generated from markdown sources (content/blog/*.md, content/words/*.md)
  const entryFolders = [
    { folder: path.join(ROOT, "content", "blog"), indexPath: "/blog/" },
    { folder: path.join(ROOT, "content", "words"), indexPath: "/words/" }
  ];
  for (let f = 0; f < entryFolders.length; f += 1) {
    const ef = entryFolders[f];
    if (!fs.existsSync(ef.folder)) continue;
    const files = fs.readdirSync(ef.folder).filter(function (name) {
      return name.toLowerCase().endsWith(".md");
    }).sort();
    for (let i = 0; i < files.length; i += 1) {
      const slug = files[i].replace(/\.md$/i, "");
      pages.push({ path: ef.indexPath + slug + "/", title: "" });
    }
  }
  pages.push({ path: "/404.html", title: "Page Not Found" });
  return pages;
}

function pathToFile(p) {
  if (p === "/") return path.join(DIST, "index.html");
  if (p === "/404.html") return path.join(DIST, "404.html");
  const rel = p.replace(/^\/+/, "").replace(/\/+$/, "");
  return path.join(DIST, rel, "index.html");
}

// Extract title text from <title>
function extractTitle(html) {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].trim() : "";
}

// Extract meta description
function extractDescription(html) {
  const m = /<meta[^>]*name=["']description["'][^>]*content=["']([^'"]*)["']/i.exec(html);
  return m ? m[1] : "";
}

// Strip SVG sprite blocks entirely (huge path data)
function stripSprites(html) {
  return html.replace(/<svg class="icon-sprite"[\s\S]*?<\/svg>/gi, "");
}

// Strip script and style blocks entirely
function stripScriptsAndStyles(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

// Strip HTML tags, collapse whitespace, decode common HTML entities
const ENTITIES = {
  "&rsquo;": "'", "&lsquo;": "'", "&rdquo;": "'", "&ldquo;": "'",
  "&mdash;": "–", "&ndash;": "–", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&nbsp;": " ", "&hellip;": "…", "&copy;": "©", "&trade;": "™", "&quot;": '"',
  "&#39;": "'", "&#x27;": "'", "&apos;": "'"
};
function decodeEntities(text) {
  return text.replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, function (m) {
    const key = m.toLowerCase();
    return key in ENTITIES ? ENTITIES[key] : m;
  });
}
function stripTags(html) {
  return decodeEntities(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Extract the visible body text, excluding nav chrome links we want to list separately
function extractVisibleText(html) {
  let cleaned = stripScriptsAndStyles(html);
  cleaned = stripSprites(cleaned);
  const bodyMatch = /<body[\s\S]*?>([\s\S]*?)<\/body>/i.exec(cleaned);
  if (!bodyMatch) return stripTags(cleaned);
  const body = bodyMatch[1];
  return stripTags(body);
}

// Extract navigation items from the menu list, marking the current page
function extractNavigation(html, currentPath) {
  const navMatch = /<nav[^>]*class="menu-box"[\s\S]*?<ul class="menu-list" data-menu-tree>([\s\S]*?)<\/ul>[\s\S]*?<\/nav>/i.exec(html);
  if (!navMatch) return [];
  const listHtml = navMatch[1];
  return parseNavList(listHtml, currentPath);
}

function parseNavList(ulHtml, currentPath) {
  const items = [];
  let rest = ulHtml;
  while (rest.length > 0) {
    const liMatch = /<li[^>]*class="menu-item"[^>]*>([\s\S]*?)<\/li>/i.exec(rest);
    if (!liMatch) break;
    const liContent = liMatch[1];
    rest = rest.slice(liMatch[0].length);

    const isCurrent = liContent.includes('aria-current="page"');

    const linkMatch = /<a[^>]*href=["']([^'"]*)["'][^>]*>([\s\S]*?)<\/a>/i.exec(liContent);
    const title = linkMatch ? stripTags(linkMatch[2]) : "";
    const href = linkMatch ? linkMatch[1] : "";

    const detailsMatch = liContent.match(/<details[\s\S]*?<summary[\s\S]*?>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/i);
    const nestedMatch = /<ul class="menu-list">([\s\S]*?)<\/ul>/i.exec(liContent);

    let children = [];
    if (nestedMatch) {
      children = parseNavList(nestedMatch[1], currentPath);
    }

    items.push({ title, href, isCurrent, children, depth: 0 });
  }
  return items;
}

function navigationToMarkdown(items, depth) {
  const lines = [];
  const indent = "  ".repeat(depth);
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const marker = item.isCurrent ? " (current page)" : "";
    lines.push(indent + "- " + item.title + marker);
    if (item.children.length > 0) {
      lines.push.apply(lines, navigationToMarkdown(item.children, depth + 1));
    }
  }
  return lines;
}

// Extract theme switcher options present on page
function extractThemeOptions(html) {
  const options = [];
  const re = /data-theme-choice=["'](dark|system|light)["'][^>]*aria-label=["']([^'"]*)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    options.push({ key: m[1], label: m[2] });
  }
  return options;
}

// Extract footer text
function extractFooter(html) {
  const footerMatch = /<footer[\s\S]*?>([\s\S]*?)<\/footer>/i.exec(html);
  if (!footerMatch) return [];
  return stripTags(footerMatch[1]).split(/\s*\.\s*/).map(s => s.trim()).filter(Boolean);
}

// Extract cookie banner text and buttons
function extractCookieBanner(html) {
  const bannerMatch = /<div class="cookie-banner"[\s\S]*?>([\s\S]*?)<\/div>/i.exec(html);
  if (!bannerMatch) return { text: "", buttons: [] };
  const banner = bannerMatch[1];
  const textMatch = /<p class="cookie-text"[^>]*>([\s\S]*?)<\/p>/i.exec(banner);
  const text = textMatch ? stripTags(textMatch[1]) : "";
  const buttons = [];
  const btnRe = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  let bm;
  while ((bm = btnRe.exec(banner)) !== null) {
    buttons.push(stripTags(bm[1]));
  }
  return { text, buttons };
}

// Detect interactive placeholders present on the page
function detectPlaceholders(html, pagePath) {
  const placeholders = [];
  const has = (re) => re.test(html);
  if (has(/data-hero-anim|hero-fallback|hero-stage/i)) placeholders.push("<hero-animation>");
  if (has(/data-menu-panel|data-menu-tree/i)) placeholders.push("<menu-navigation>");
  if (has(/data-menu-search|menu-search-input/i)) placeholders.push("<search-bar>");
  if (has(/data-theme-choice/i)) placeholders.push("<theme-switcher>");
  if (has(/data-cookie-banner/i)) placeholders.push("<cookie-banner>");
  if (has(/data-lightbox/i)) placeholders.push("<lightbox>");
  if (has(/<img[^>]*>/i)) placeholders.push("");
  if (has(/skip-link|menu-bubble|aria-current="page"/i)) placeholders.push("<interactive>");
  // Only pages under /playground/ carry an actual game bundle
  if (/^\/playground\//i.test(pagePath)) placeholders.push("<game>");
  return placeholders;
}

// Heading tag finder for section/sub-section structure
function extractHeadings(html) {
  const mainMatch = /<main[\s\S]*?>([\s\S]*?)<\/main>/i.exec(html);
  const sectionHtml = mainMatch ? mainMatch[1] : html;
  const sections = [];
  // split by section
  const secRe = /<section[\s\S]*?>([\s\S]*?)<\/section>/gi;
  let m;
  while ((m = secRe.exec(sectionHtml)) !== null) {
    const content = m[1];
    const h2Match = /<h2[^>]*class="section-heading"[^>]*>([\s\S]*?)<\/h2>/i.exec(content);
    const h3s = [];
    const h3Re = /<h3[^>]*class="article-heading"[^>]*>([\s\S]*?)<\/h3>/gi;
    let h3m;
    while ((h3m = h3Re.exec(content)) !== null) {
      h3s.push(stripTags(h3m[1]));
    }
    const paras = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(content)) !== null) {
      paras.push(stripTags(pm[1]));
    }
    sections.push({ h2: h2Match ? stripTags(h2Match[1]) : null, h3s, paras });
  }
  return sections;
}

function slugify(path) {
  let p = path === "/" ? "index" : path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (p.endsWith(".html")) p = p.slice(0, -5);
  return p.replace(/[\/\-]/g, "_");
}

function buildMarkdown(page, html) {
  const title = extractTitle(html) || page.title;
  const desc = extractDescription(html);
  const source = page.path === "/404.html" ? "404.html" : pathToFile(page.path).replace(ROOT + path.sep, "").replace(/\\/g, "/");
  const nav = extractNavigation(html, page.path);
  const themeOpts = extractThemeOptions(html);
  const cookie = extractCookieBanner(html);
  const sections = extractHeadings(html);
  const placeholders = detectPlaceholders(html);

  const lines = [];
  lines.push("# " + title);
  lines.push("");
  lines.push("*Source: " + source + "*");
  if (desc) lines.push("Text: " + desc);
  lines.push("");

  // Visible User-Facing Text (rich format like about_philosophy.md)
  lines.push("---");
  lines.push("");
  lines.push("## Visible User-Facing Text");
  lines.push("");

  // Section headings + body text
  for (let i = 0; i < sections.length; i += 1) {
    const s = sections[i];
    if (s.h2) {
      lines.push("### Section Heading: " + s.h2);
      lines.push("");
    }
    for (let j = 0; j < s.h3s.length; j += 1) {
      lines.push("### Sub-section: " + s.h3s[j]);
      lines.push("");
    }
    for (let j = 0; j < s.paras.length; j += 1) {
      lines.push("- " + s.paras[j]);
    }
    if (s.paras.length > 0) lines.push("");
  }

  // Page title
  const h1Match = /<h1[^>]*class="site-title"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const h1 = h1Match ? stripTags(h1Match[1]) : title;
  lines.push("### Page Title");
  lines.push("");
  lines.push("- " + h1);
  lines.push("");

  // Navigation
  lines.push("### Navigation");
  lines.push("");
  const navLines = navigationToMarkdown(nav, 0);
  if (navLines.length > 0) {
    lines.push.apply(lines, navLines);
  } else {
    lines.push("- (no navigation)");
  }
  lines.push("");

  // Theme switcher
  lines.push("### Theme Switcher");
  lines.push("");
  if (themeOpts.length > 0) {
    for (let i = 0; i < themeOpts.length; i += 1) {
      lines.push("- " + themeOpts[i].label + " (" + themeOpts[i].key + " theme)");
    }
  } else {
    lines.push("- (none)");
  }
  lines.push("");

  // Footer / Cookie
  lines.push("### Footer");
  lines.push("");
  if (cookie.text) {
    lines.push("- Cookie text: " + cookie.text);
  }
  if (cookie.buttons.length > 0) {
    lines.push("- Cookie buttons: " + cookie.buttons.join(", "));
  }
  lines.push("- Annoying Goods all rights reserved 2026.");
  lines.push("- Cookie settings");
  lines.push("");

  // Non-Text / Interactive Placeholders
  lines.push("---");
  lines.push("");
  lines.push("## Non-Text / Interactive Placeholders");
  lines.push("");
  if (placeholders.length > 0) {
    for (let i = 0; i < placeholders.length; i += 1) {
      lines.push("- " + placeholders[i]);
    }
  } else {
    lines.push("- (none)");
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  fs.mkdirSync(MD_DIR, { recursive: true });
  const pages = allDocumentPages();
  let count = 0;
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    const file = pathToFile(page.path);
    if (!fs.existsSync(file)) {
      console.error("SKIP (missing built page): " + page.path + " -> " + file);
      continue;
    }
    const html = readFile(file);
    const md = buildMarkdown(page, html);
    const outName = slugify(page.path) + ".md";
    const outPath = path.join(MD_DIR, outName);
    fs.writeFileSync(outPath, md);
    count += 1;
  }
  console.log("Generated " + count + " documentation pages in " + MD_DIR);
}

main();
