import { normalizePath } from "./utils-dom.js";
const FLAT_FALLBACK = [
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
let pages = [];
let entries = [];
let byPath = new Map();
let loaded = false;
export function initMenuData() {
    if (loaded) {
        return;
    }
    loaded = true;
    const payload = readPayload();
    if (payload) {
        pages = flattenPages(payload.pages);
        entries = flattenEntries(payload.entries);
    }
    else {
        pages = FLAT_FALLBACK.slice();
    }
    rebuildIndex();
}
function readPayload() {
    const el = document.querySelector("script[data-menu-tree-payload]");
    if (!el) {
        return null;
    }
    const raw = el.textContent || "";
    if (raw.trim().length === 0) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.pages)) {
            return null;
        }
        return parsed;
    }
    catch (err) {
        void err;
        return null;
    }
}
function flattenPages(nodes) {
    const out = [];
    flattenInto(nodes, out);
    return out;
}
function flattenEntries(nodes) {
    if (!nodes || nodes.length === 0) {
        return [];
    }
    const out = [];
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
function flattenInto(nodes, out) {
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
function rebuildIndex() {
    byPath = new Map();
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
export function getMenuPages() {
    return pages.slice();
}
export function getMenuEntries() {
    return entries.slice();
}
export function findMenuPage(path) {
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
export function getMenuBranch(path) {
    const page = findMenuPage(path);
    if (!page) {
        return [];
    }
    const branch = [page];
    let cursor = page;
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
//# sourceMappingURL=menu-data.js.map