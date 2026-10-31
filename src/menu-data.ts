import { normalizePath } from "./utils-dom.js";
export interface MenuPage {
  path: string;
  title: string;
  parent: string | null;
  depth: number;
  keywords: string[];
}
export interface MenuPayload {
  generatedFrom: string;
  pages: MenuPageNode[];
  entries?: MenuEntryNode[];
}
export interface MenuEntryNode {
  path: string;
  title: string;
  collection: string;
  parent: string | null;
  date: string;
  keywords: string[];
}
export interface MenuEntry {
  path: string;
  title: string;
  collection: string;
  parent: string | null;
  date: string;
  depth: number;
  keywords: string[];
}
export interface MenuPageNode {
  path: string;
  title: string;
  parent: string | null;
  depth: number;
  keywords: string[];
  children: MenuPageNode[];
}
const FLAT_FALLBACK: MenuPage[] = [
  { path: "/", title: "Home", parent: null, depth: 0, keywords: ["home"] },
  { path: "/about/", title: "About", parent: null, depth: 0, keywords: ["about"] },
  { path: "/products/", title: "Products", parent: null, depth: 0, keywords: ["products"] },
  { path: "/products/agit/", title: "AGIT", parent: "/products/", depth: 1, keywords: ["agit"] },
  { path: "/labs/", title: "Labs", parent: null, depth: 0, keywords: ["labs"] },
  { path: "/blog/", title: "Blog", parent: null, depth: 0, keywords: ["blog"] },
  { path: "/words/", title: "Words", parent: null, depth: 0, keywords: ["words"] },
  { path: "/support/", title: "Support", parent: null, depth: 0, keywords: ["support"] },
  { path: "/contact/", title: "Contact", parent: null, depth: 0, keywords: ["contact"] },
];
let pages: MenuPage[] = [];
let entries: MenuEntry[] = [];
let byPath: Map<string, MenuPage> = new Map<string, MenuPage>();
let loaded = false;
export function initMenuData(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  const payload = readPayload();
  if (payload) {
    pages = flattenPages(payload.pages);
    entries = flattenEntries(payload.entries);
  } else {
    pages = FLAT_FALLBACK.slice();
  }
  rebuildIndex();
}
function readPayload(): MenuPayload | null {
  const el = document.querySelector("script[data-menu-tree-payload]");
  if (!el) {
    return null;
  }
  const raw = el.textContent || "";
  if (raw.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as MenuPayload;
    if (!parsed || !Array.isArray(parsed.pages)) {
      return null;
    }
    return parsed;
  } catch (err) {
    void err;
    return null;
  }
}
function flattenPages(nodes: MenuPageNode[]): MenuPage[] {
  const out: MenuPage[] = [];
  flattenInto(nodes, out);
  return out;
}
function flattenEntries(nodes: MenuEntryNode[] | undefined): MenuEntry[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }
  const out: MenuEntry[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node) {
      continue;
    }
    out.push({
      path: node.path,
      title: node.title,
      collection: node.collection,
      parent: node.parent === undefined ? null : node.parent,
      date: node.date,
      depth: 1,
      keywords: Array.isArray(node.keywords) ? node.keywords.slice() : [],
    });
  }
  return out;
}
function flattenInto(nodes: MenuPageNode[], out: MenuPage[]): void {
  for (let i = 0; i < nodes.length; i = i + 1) {
    const node = nodes[i];
    if (!node) {
      continue;
    }
    out.push({
      path: node.path,
      title: node.title,
      parent: node.parent,
      depth: node.depth,
      keywords: Array.isArray(node.keywords) ? node.keywords.slice() : [],
    });
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenInto(node.children, out);
    }
  }
}
function rebuildIndex(): void {
  byPath = new Map<string, MenuPage>();
  for (let i = 0; i < pages.length; i = i + 1) {
    const page = pages[i];
    if (!page) {
      continue;
    }
    byPath.set(normalizePath(page.path), page);
  }
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry || !entry.parent) {
      continue;
    }
    const parent = byPath.get(normalizePath(entry.parent));
    if (parent) {
      entry.depth = parent.depth + 1;
    }
  }
}
export function getMenuPages(): MenuPage[] {
  return pages.slice();
}
export function getMenuEntries(): MenuEntry[] {
  return entries.slice();
}
export function findMenuPage(path: string): MenuPage | null {
  const key = normalizePath(path);
  const direct = byPath.get(key);
  if (direct) {
    return direct;
  }
  const withSlash = byPath.get(key + "/");
  if (withSlash) {
    return withSlash;
  }
  return null;
}
export function getMenuBranch(path: string): MenuPage[] {
  const page = findMenuPage(path);
  if (!page) {
    return [];
  }
  const branch: MenuPage[] = [page];
  let cursor: MenuPage | null = page;
  while (cursor && cursor.parent) {
    const parent = findMenuPage(cursor.parent);
    if (!parent) {
      break;
    }
    branch.unshift(parent);
    cursor = parent;
  }
  return branch;
}
