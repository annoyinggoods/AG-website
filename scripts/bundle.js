// utils-dom.js
function queryOne(root, selector) {
    const found = root.querySelector(selector);
    return found;
}
function queryAll(root, selector) {
    const list = root.querySelectorAll(selector);
    const out = [];
    list.forEach(function (el) {
        out.push(el);
    });
    return out;
}
function normalizePath(raw) {
    let path = raw.trim();
    if (path.length === 0) {
        return "/";
    }
    const hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
        path = path.slice(0, hashIndex);
    }
    const queryIndex = path.indexOf("?");
    if (queryIndex >= 0) {
        path = path.slice(0, queryIndex);
    }
    if (path.endsWith("/index.html")) {
        path = path.slice(0, path.length - "/index.html".length);
    }
    if (path.endsWith(".html")) {
        const withoutExt = path.slice(0, path.length - ".html".length);
        if (withoutExt.length === 0) {
            path = "/";
        }
        else {
            path = withoutExt;
        }
    }
    if (path.length === 0) {
        return "/";
    }
    if (path.charAt(0) !== "/") {
        path = "/" + path;
    }
    if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, path.length - 1);
    }
    if (path === "/index") {
        return "/";
    }
    return path.toLowerCase();
}
function getCanonicalPath() {
    const body = document.body;
    if (body) {
        const attr = body.getAttribute("data-page");
        if (attr && attr.trim().length > 0) {
            return normalizePath(attr);
        }
    }
    return normalizePath(window.location.pathname);
}
function isSameSiteUrl(href) {
    let url;
    try {
        url = new URL(href, window.location.href);
    }
    catch (err) {
        void err;
        return false;
    }
    return url.origin === window.location.origin;
}
const DOWNLOAD_EXTENSIONS = [".exe", ".msi", ".zip", ".7z", ".rar", ".dmg", ".pkg", ".apk", ".tar", ".gz", ".tgz", ".whl", ".iso"];
function isDownloadHref(href) {
    const path = href.split("#")[0]?.split("?")[0] || "";
    const lower = path.toLowerCase();
    return DOWNLOAD_EXTENSIONS.some(function (ext) {
        return lower.endsWith(ext);
    });
}
function prefersReducedMotion() {
    if (typeof window.matchMedia !== "function") {
        return false;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    return query.matches;
}
function hasFinePointer() {
    if (typeof window.matchMedia !== "function") {
        return false;
    }
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    return fine.matches && hover.matches;
}
const memorySession = new Map();
function readSessionString(key) {
    try {
        const value = window.sessionStorage.getItem(key);
        if (value !== null) {
            return value;
        }
        return memorySession.get(key) || null;
    }
    catch (err) {
        void err;
        return memorySession.get(key) || null;
    }
}
function isReloadNavigation() {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
        return false;
    }
    const entries = performance.getEntriesByType("navigation");
    const entry = entries[0];
    return !!entry && entry.type === "reload";
}
function readSessionJson(key) {
    const raw = readSessionString(key);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch (err) {
        void err;
        return null;
    }
}
function writeSessionJson(key, value) {
    try {
        writeSessionString(key, JSON.stringify(value));
    }
    catch (err) {
        void err;
    }
}
function writeSessionString(key, value) {
    try {
        window.sessionStorage.setItem(key, value);
        return;
    }
    catch (err) {
        void err;
    }
    memorySession.set(key, value);
}
const memoryStorage = new Map();
const warnedStorageKeys = new Set();
function warnStorageOnce(key, err) {
    if (warnedStorageKeys.has(key)) {
        return;
    }
    warnedStorageKeys.add(key);
    console.warn("localStorage unavailable for key " + key + ", falling back to in-memory storage", err);
}
function readLocalString(key) {
    try {
        return window.localStorage.getItem(key);
    }
    catch (err) {
        warnStorageOnce(key, err);
        return memoryStorage.get(key) || null;
    }
}
function writeLocalString(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return;
    }
    catch (err) {
        warnStorageOnce(key, err);
        memoryStorage.set(key, value);
    }
}
function removeLocalString(key) {
    try {
        window.localStorage.removeItem(key);
        return;
    }
    catch (err) {
        warnStorageOnce(key, err);
    }
    memoryStorage.delete(key);
}
function readLocalJson(key) {
    const raw = readLocalString(key);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        return parsed;
    }
    catch (err) {
        void err;
        return null;
    }
}
function writeLocalJson(key, value) {
    try {
        writeLocalString(key, JSON.stringify(value));
    }
    catch (err) {
        void err;
    }
}
function debounce(fn, delay) {
    let timer = 0;
    return function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(fn, delay);
    };
}
function onNextFrame(fn) {
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
            fn();
        });
    }
    else {
        window.setTimeout(fn, 16);
    }
}
function isEditableTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }
    const editable = target.closest("input, textarea, select, [contenteditable]");
    return editable !== null;
}
function isMenuChrome(target) {
    if (!(target instanceof Element)) {
        return false;
    }
    const chrome = target.closest("[data-menu], [data-menu-bubble]");
    return chrome !== null;
}

// menu-data.js

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
function initMenuData() {
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
function getMenuPages() {
    return pages.slice();
}
function getMenuEntries() {
    return entries.slice();
}
function findMenuPage(path) {
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
function getMenuBranch(path) {
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

// page-state.js

function initPageState() {
    const current = getCanonicalPath();
    highlightActiveLink(current);
    markParentSections();
    markBranchLevels();
    keepStateFresh();
}
function highlightActiveLink(current) {
    const links = document.querySelectorAll("a.menu-link");
    links.forEach(function (el) {
        if (el instanceof HTMLAnchorElement) {
            el.removeAttribute("aria-current");
            el.closest("li.menu-item")?.classList.remove("is-active-page");
        }
    });
    const best = pickBestLink(links, current);
    if (best) {
        best.setAttribute("aria-current", "page");
        best.closest("li.menu-item")?.classList.add("is-active-page");
    }
}
function pickBestLink(links, current) {
    let best = null;
    let bestScore = -1;
    links.forEach(function (el) {
        if (!(el instanceof HTMLAnchorElement)) {
            return;
        }
        const href = el.getAttribute("href") || "";
        const score = scoreLink(href, current);
        if (score > bestScore) {
            bestScore = score;
            best = el;
        }
    });
    if (bestScore <= 0) {
        return null;
    }
    return best;
}
function scoreLink(href, current) {
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
        return -1;
    }
    const hashSplit = href.split("#");
    const pathPart = hashSplit[0] || "";
    const anchorPart = hashSplit.length > 1 ? hashSplit[1] || "" : "";
    if (pathPart.length === 0 && anchorPart.length > 0) {
        return 1;
    }
    const normalized = normalizePath(pathPart.length === 0 ? current : pathPart);
    if (normalized === current) {
        return anchorPart.length > 0 ? 12 : 10;
    }
    const currentSlug = current.replace(/\/$/, "").split("/").pop() || "";
    const linkSlug = normalized.replace(/\/$/, "").split("/").pop() || "";
    if (currentSlug.length > 0 && currentSlug === linkSlug) {
        return 8;
    }
    return -1;
}
function markParentSections() {
    document.querySelectorAll("li.menu-item.is-parent-section").forEach(function (el) {
        el.classList.remove("is-parent-section");
    });
    const active = document.querySelector("a.menu-link[aria-current='page']");
    if (!active) {
        return;
    }
    let cursor = active.closest("li.menu-item");
    cursor = cursor ? cursor.parentElement?.closest("li.menu-item") || null : null;
    while (cursor) {
        cursor.classList.add("is-parent-section");
        const toggle = cursor.querySelector(":scope > .menu-toggle");
        if (toggle instanceof HTMLElement) {
            toggle.setAttribute("aria-expanded", "true");
        }
        const group = cursor.querySelector(":scope > [data-menu-group]");
        if (group instanceof HTMLElement) {
            group.hidden = false;
        }
        cursor = cursor.parentElement?.closest("li.menu-item") || null;
    }
}
function keepStateFresh() {
    window.addEventListener("pageshow", function () {
        const current = getCanonicalPath();
        highlightActiveLink(current);
        markParentSections();
        markBranchLevels();
    });
}
const BRANCH_SHADE_STEPS = 6;
function markBranchLevels() {
    document.querySelectorAll("[data-branch-level]").forEach(function (el) {
        el.removeAttribute("data-branch-level");
    });
    const active = document.querySelector("a.menu-link[aria-current='page']");
    if (!active) {
        return;
    }
    const chain = [];
    let cursor = active.closest("li.menu-item");
    cursor = cursor ? cursor.parentElement?.closest("li.menu-item") || null : null;
    while (cursor) {
        chain.push(cursor);
        cursor = cursor.parentElement?.closest("li.menu-item") || null;
    }
    for (let i = 0; i < chain.length; i += 1) {
        const item = chain[i];
        if (!item) {
            continue;
        }
        item.setAttribute("data-branch-level", String(Math.min(i + 1, BRANCH_SHADE_STEPS)));
    }
}

// menu-tree.js


const EXPAND_MS = 250;
function initMenuTree() {
    initMenuData();
    const nav = document.querySelector("[data-menu]");
    if (!nav) {
        return;
    }
    upgradeDetailsToButtons(nav);
    closeAllGroups(nav);
    expandActiveBranch(nav);
}
function upgradeDetailsToButtons(nav) {
    const items = nav.querySelectorAll("li.menu-item");
    items.forEach(function (item) {
        const details = item.querySelector(":scope > details.menu-details");
        if (!(details instanceof HTMLDetailsElement)) {
            return;
        }
        const summary = details.querySelector("summary");
        const childList = details.querySelector(":scope > ul.menu-list");
        if (!summary || !childList) {
            return;
        }
        const heading = summary.querySelector(".menu-heading");
        const link = summary.querySelector("a.menu-link");
        if (!heading || !(link instanceof HTMLAnchorElement)) {
            return;
        }
        const labelText = (link.textContent || "").trim();
        const href = link.getAttribute("href") || "";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.classList.add("menu-toggle");
        toggle.setAttribute("aria-expanded", details.open ? "true" : "false");
        toggle.setAttribute("aria-label", "Toggle " + labelText + " submenu");
        toggle.textContent = "";
        toggle.dataset.menuPath = href;
        toggle.setAttribute("data-menu-toggle", "true");
        const headingText = (heading.textContent || "").trim();
        heading.textContent = "";
        heading.appendChild(link);
        link.textContent = labelText;
        restoreArrow(link);
        link.removeAttribute("tabindex");
        link.removeAttribute("aria-hidden");
        const navLink = document.createElement("a");
        navLink.classList.add("menu-link");
        navLink.classList.add("menu-parent-link");
        navLink.href = href;
        navLink.textContent = headingText.length > 0 ? headingText : labelText;
        restoreArrow(navLink);
        const row = document.createElement("span");
        row.className = "menu-parent-row";
        item.insertBefore(row, details);
        row.appendChild(toggle);
        row.appendChild(navLink);
        item.insertBefore(childList, details);
        details.remove();
        childList.setAttribute("data-menu-group", labelText);
        if (toggle.getAttribute("aria-expanded") === "false") {
            if (childList instanceof HTMLElement) {
                childList.hidden = true;
            }
        }
        styleGroup(childList, false);
        toggle.addEventListener("click", function () {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            if (!(childList instanceof HTMLElement)) {
                return;
            }
            if (expanded) {
                toggle.setAttribute("aria-expanded", "false");
                childList.hidden = true;
                styleGroup(childList, true);
            }
            else {
                toggle.setAttribute("aria-expanded", "true");
                childList.hidden = false;
                styleGroup(childList, true);
            }
        });
        item.setAttribute("data-menu-upgraded", "true");
    });
}
function restoreArrow(link) {
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("class", "menu-arrow");
    arrow.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-arrow-right");
    arrow.appendChild(use);
    link.appendChild(arrow);
}
function styleGroup(group, animate) {
    if (!(group instanceof HTMLElement)) {
        return;
    }
    group.style.overflow = "hidden";
    if (animate && !prefersReducedMotion()) {
        group.style.transition = "max-height 240ms ease";
    }
    if (group.hidden) {
        group.style.maxHeight = "0";
    }
    else {
        group.style.maxHeight = "60rem";
        window.setTimeout(function () {
            applySettledHeight(group);
        }, EXPAND_MS + 30);
    }
}
function applySettledHeight(group) {
    if (!(group instanceof HTMLElement) || group.hidden) {
        return;
    }
    group.style.maxHeight = "60rem";
}
function expandActiveBranch(nav) {
    const current = getCanonicalPath();
    const active = findLinkByPath(nav, current);
    if (!active) {
        return;
    }
    let cursor = active.closest("li.menu-item");
    while (cursor) {
        const toggle = cursor.querySelector(".menu-toggle");
        const group = cursor.querySelector(":scope > [data-menu-group]");
        if (toggle instanceof HTMLElement) {
            toggle.setAttribute("aria-expanded", "true");
        }
        if (group instanceof HTMLElement) {
            group.hidden = false;
            styleGroup(group, false);
        }
        cursor = cursor.parentElement?.closest("li.menu-item") || null;
    }
}
function findLinkByPath(nav, current) {
    const links = nav.querySelectorAll("a.menu-link, a.menu-parent-link");
    for (let i = 0; i < links.length; i = i + 1) {
        const el = links[i];
        if (!(el instanceof HTMLAnchorElement)) {
            continue;
        }
        const href = el.getAttribute("href") || "";
        if (normalizePath(href) === current) {
            return el;
        }
    }
    return null;
}
function openGroup(group) {
    if (group instanceof HTMLElement) {
        group.hidden = false;
        styleGroup(group, false);
    }
    const item = group.closest("li.menu-item");
    const toggle = item ? item.querySelector(":scope > .menu-toggle") : null;
    if (toggle instanceof HTMLElement) {
        toggle.setAttribute("aria-expanded", "true");
    }
}
function openParentGroups(group) {
    let cursor = group.parentElement;
    while (cursor) {
        if (cursor instanceof HTMLElement && cursor.hasAttribute("data-menu-group")) {
            openGroup(cursor);
        }
        cursor = cursor.parentElement;
    }
}
function closeAllGroups(nav) {
    const toggles = nav.querySelectorAll(".menu-toggle");
    toggles.forEach(function (toggle) {
        if (toggle instanceof HTMLElement) {
            toggle.setAttribute("aria-expanded", "false");
        }
    });
    const groups = nav.querySelectorAll("[data-menu-group]");
    groups.forEach(function (group) {
        if (group instanceof HTMLElement) {
            group.hidden = true;
            group.style.maxHeight = "0";
        }
    });
}

// utils-fuzzy.js
function scoreSubsequence(query, title) {
    const q = query.toLowerCase();
    const t = title.toLowerCase();
    if (q.length === 0) {
        return { index: 0, score: 0, positions: [] };
    }
    const positions = [];
    let cursor = 0;
    for (let i = 0; i < q.length; i = i + 1) {
        const ch = q.charAt(i);
        const found = t.indexOf(ch, cursor);
        if (found < 0) {
            return null;
        }
        positions.push(found);
        cursor = found + 1;
    }
    let score = 100 - (t.length - q.length);
    score = score + positions.length * 2;
    if (t.indexOf(q) === 0) {
        score = score + 40;
    }
    score = score + countWordStartHits(t, positions) * 8;
    score = score + countPrefixRuns(positions) * 5;
    if (t.length < 20) {
        score = score + 6;
    }
    if (positions.length === 0) {
        return null;
    }
    const first = positions[0];
    if (first === undefined) {
        return null;
    }
    return { index: first, score: score, positions: positions };
}
function isWordStart(text, index) {
    if (index === 0) {
        return true;
    }
    const prev = text.charAt(index - 1);
    return prev === " " || prev === "-" || prev === "/" || prev === "_" || prev === ".";
}
function countWordStartHits(text, positions) {
    let hits = 0;
    for (let i = 0; i < positions.length; i = i + 1) {
        const pos = positions[i];
        if (pos === undefined) {
            continue;
        }
        if (isWordStart(text, pos)) {
            hits = hits + 1;
        }
    }
    return hits;
}
function countPrefixRuns(positions) {
    if (positions.length < 2) {
        return 0;
    }
    let runs = 0;
    for (let i = 1; i < positions.length; i = i + 1) {
        const prev = positions[i - 1];
        const curr = positions[i];
        if (prev === undefined || curr === undefined) {
            continue;
        }
        if (curr === prev + 1) {
            runs = runs + 1;
        }
    }
    return runs;
}
function rankTitles(query, titles) {
    const trimmed = query.trim().toLowerCase();
    const hits = [];
    for (let i = 0; i < titles.length; i = i + 1) {
        const title = titles[i];
        if (title === undefined) {
            continue;
        }
        const hit = scoreSubsequence(trimmed, title);
        if (hit) {
            hits.push({ index: i, score: hit.score, positions: hit.positions });
        }
    }
    hits.sort(compareHits);
    return hits;
}
function compareHits(a, b) {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    return a.index - b.index;
}
function buildHighlight(title, positions) {
    if (positions.length === 0) {
        return escapeHtml(title);
    }
    const sorted = positions.slice().sort(compareNumbers);
    const ranges = coalesceRuns(sorted);
    let out = "";
    let cursor = 0;
    for (let i = 0; i < ranges.length; i = i + 1) {
        const range = ranges[i];
        if (!range) {
            continue;
        }
        if (range.start > cursor) {
            out = out + escapeHtml(title.slice(cursor, range.start));
        }
        out = out + "<mark>" + escapeHtml(title.slice(range.start, range.end)) + "</mark>";
        cursor = range.end;
    }
    if (cursor < title.length) {
        out = out + escapeHtml(title.slice(cursor));
    }
    return out;
}
function compareNumbers(a, b) {
    return a - b;
}
function coalesceRuns(sorted) {
    const ranges = [];
    for (let i = 0; i < sorted.length; i = i + 1) {
        const pos = sorted[i];
        if (pos === undefined) {
            continue;
        }
        const last = ranges[ranges.length - 1];
        if (last && pos <= last.end) {
            if (pos + 1 > last.end) {
                last.end = pos + 1;
            }
        }
        else {
            ranges.push({ start: pos, end: pos + 1 });
        }
    }
    return ranges;
}
function escapeHtml(raw) {
    return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// menu-search.js



const MAX_RESULTS = 25;
const DEBOUNCE_MS = 120;
function initMenuSearch() {
    initMenuData();
    const input = document.querySelector("[data-menu-search]");
    const nav = document.querySelector("[data-menu]");
    if (!(input instanceof HTMLInputElement) || !nav) {
        return;
    }
    const resultsHost = document.querySelector("[data-menu-results]");
    const liveRegion = document.querySelector("[data-menu-search-status]");
    const tree = document.querySelector("[data-menu-tree]");
    const clearButton = document.querySelector("[data-menu-search-clear]");
    if (!(resultsHost instanceof HTMLElement) || !(liveRegion instanceof HTMLElement)) {
        return;
    }
    const host = resultsHost;
    const live = liveRegion;
    let activeIndex = -1;
    let currentItems = [];
    let currentTotal = 0;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "menu-search-listbox");
    host.id = "menu-search-listbox";
    const runSearch = debounce(function () {
        const query = input.value;
        const outcome = searchPages(query);
        currentItems = outcome.items;
        currentTotal = outcome.total;
        activeIndex = -1;
        renderResults(host, tree, outcome, query);
        announceCount(live, outcome, query);
        syncChrome(nav, input, clearButton, query);
    }, DEBOUNCE_MS);
    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex = moveActive(host, activeIndex, 1);
        }
        else if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex = moveActive(host, activeIndex, -1);
        }
        else if (event.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < currentItems.length) {
                const picked = currentItems[activeIndex];
                if (picked) {
                    event.preventDefault();
                    followResult(picked);
                }
            }
        }
        else if (event.key === "Escape") {
            input.value = "";
            currentItems = [];
            currentTotal = 0;
            activeIndex = -1;
            renderResults(host, tree, { items: [], total: 0 }, "");
            announceCount(live, { items: [], total: 0 }, "");
            syncChrome(nav, input, clearButton, "");
            input.blur();
        }
    });
    if (clearButton instanceof HTMLButtonElement) {
        clearButton.addEventListener("click", function () {
            input.value = "";
            currentItems = [];
            currentTotal = 0;
            activeIndex = -1;
            renderResults(host, tree, { items: [], total: 0 }, "");
            announceCount(live, { items: [], total: 0 }, "");
            syncChrome(nav, input, clearButton, "");
            input.focus();
        });
    }
}
function syncChrome(nav, input, clearButton, query) {
    const searching = query.trim().length > 0;
    if (searching) {
        document.body.classList.add("menu-searching");
        input.setAttribute("aria-expanded", "true");
    }
    else {
        document.body.classList.remove("menu-searching");
        input.setAttribute("aria-expanded", "false");
    }
    if (clearButton instanceof HTMLElement) {
        clearButton.hidden = !searching;
    }
    void nav;
}
function searchPages(query) {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) {
        return { items: [], total: 0 };
    }
    const pages = getMenuPages();
    const entries = getMenuEntries();
    const items = [];
    for (let i = 0; i < pages.length; i = i + 1) {
        const page = pages[i];
        if (!page) {
            continue;
        }
        const titleHit = scoreSubsequence(trimmed, page.title);
        const keywordhits = countKeywordHits(trimmed, page.keywords);
        if (!titleHit && keywordhits === 0) {
            continue;
        }
        const base = titleHit ? titleHit.score : 40;
        const score = base + keywordhits * 6 - page.depth;
        let positions = [];
        if (titleHit) {
            positions = titleHit.positions.filter(function (pos) {
                return pos < page.title.length;
            });
        }
        items.push({
            title: page.title,
            href: page.path,
            depth: page.depth,
            score: score,
            positions: positions,
        });
    }
    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (!entry) {
            continue;
        }
        const titleHit = scoreSubsequence(trimmed, entry.title);
        const keywordhits = countKeywordHits(trimmed, entry.keywords);
        if (!titleHit && keywordhits === 0) {
            continue;
        }
        const base = titleHit ? titleHit.score : 40;
        const score = base + keywordhits * 6 - entry.depth;
        let positions = [];
        if (titleHit) {
            positions = titleHit.positions.filter(function (pos) {
                return pos < entry.title.length;
            });
        }
        items.push({
            title: entry.title,
            href: entry.path,
            depth: entry.depth,
            score: score,
            positions: positions,
        });
    }
    items.sort(compareItems);
    const total = items.length;
    return { items: items.slice(0, MAX_RESULTS), total: total };
}
function countKeywordHits(query, keywords) {
    let hits = 0;
    for (let i = 0; i < keywords.length; i = i + 1) {
        const keyword = keywords[i];
        if (!keyword) {
            continue;
        }
        if (keyword.toLowerCase().indexOf(query) >= 0) {
            hits = hits + 1;
        }
    }
    return hits;
}
function compareItems(a, b) {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    if (a.depth !== b.depth) {
        return a.depth - b.depth;
    }
    if (a.title < b.title) {
        return -1;
    }
    if (a.title > b.title) {
        return 1;
    }
    return 0;
}
function renderResults(host, tree, outcome, query) {
    host.innerHTML = "";
    if (query.trim().length === 0) {
        host.hidden = true;
        if (tree instanceof HTMLElement) {
            tree.hidden = false;
        }
        return;
    }
    if (tree instanceof HTMLElement) {
        tree.hidden = true;
    }
    host.hidden = false;
    const list = document.createElement("ul");
    list.className = "menu-search-list";
    list.setAttribute("role", "presentation");
    const visible = outcome.items;
    for (let i = 0; i < visible.length; i = i + 1) {
        const item = visible[i];
        if (!item) {
            continue;
        }
        const row = document.createElement("li");
        row.classList.add("menu-search-item");
        row.classList.add("menu-item");
        row.setAttribute("role", "option");
        row.id = "menu-search-option-" + String(i);
        row.setAttribute("aria-selected", "false");
        row.setAttribute("data-search-index", String(i));
        row.style.paddingInlineStart = String(0.5 + item.depth * 0.9) + "rem";
        const link = document.createElement("a");
        link.classList.add("menu-link");
        link.classList.add("menu-search-link");
        link.href = item.href;
        link.tabIndex = -1;
        link.innerHTML = buildHighlight(item.title, item.positions);
        row.appendChild(link);
        list.appendChild(row);
    }
    host.appendChild(list);
    if (outcome.total > visible.length) {
        const more = document.createElement("p");
        more.className = "menu-search-more";
        more.textContent = String(outcome.total - visible.length) + " more";
        host.appendChild(more);
    }
    if (visible.length === 0) {
        const empty = document.createElement("p");
        empty.className = "menu-search-empty";
        empty.textContent = "No pages match this query.";
        host.appendChild(empty);
    }
}
function announceCount(live, outcome, query) {
    if (query.trim().length === 0) {
        live.hidden = true;
        live.textContent = "Full page tree restored.";
        return;
    }
    live.hidden = false;
    const shown = outcome.items.length;
    if (outcome.total === 0) {
        live.textContent = "No matching pages.";
    }
    else if (outcome.total > shown) {
        live.textContent = String(shown) + " of " + String(outcome.total) + " matching pages shown.";
    }
    else {
        live.textContent = String(shown) + " matching pages.";
    }
}
function moveActive(host, activeIndex, delta) {
    const rows = host.querySelectorAll("[data-search-index]");
    if (rows.length === 0) {
        return -1;
    }
    let next = activeIndex + delta;
    if (next < 0) {
        next = 0;
    }
    if (next >= rows.length) {
        next = rows.length - 1;
    }
    rows.forEach(function (row) {
        row.setAttribute("aria-selected", "false");
        row.classList.remove("is-active");
    });
    const target = rows[next];
    if (!(target instanceof HTMLElement)) {
        return -1;
    }
    target.setAttribute("aria-selected", "true");
    target.classList.add("is-active");
    target.scrollIntoView({ block: "nearest" });
    const input = document.querySelector("[data-menu-search]");
    if (input instanceof HTMLInputElement) {
        input.setAttribute("aria-activedescendant", target.id);
    }
    return next;
}
function followResult(item) {
    window.location.href = item.href;
}

// menu-dim.js

const DIM_MS = 15000;
const DIM_CLASS = "is-dimmed";
function initMenuDim() {
    const nav = document.querySelector("[data-menu]");
    if (!(nav instanceof HTMLElement)) {
        return;
    }
    const panel = nav;
    let timer = 0;
    let frameQueued = false;
    let hovering = false;
    let focused = false;
    function shouldSuppress() {
        if (hovering || focused) {
            return true;
        }
        const active = document.activeElement;
        if (active instanceof Element && panel.contains(active)) {
            return true;
        }
        if (isEditableTarget(active)) {
            return true;
        }
        if (panel.classList.contains("is-open")) {
            return true;
        }
        if (document.body.classList.contains("is-dragging")) {
            return true;
        }
        if (document.body.classList.contains("menu-searching")) {
            return true;
        }
        return false;
    }
    function applyDim() {
        if (shouldSuppress()) {
            schedule();
            return;
        }
        panel.classList.add(DIM_CLASS);
    }
    function schedule() {
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
        timer = window.setTimeout(applyDim, DIM_MS);
    }
    function queueActivity() {
        if (frameQueued) {
            return;
        }
        frameQueued = true;
        onNextFrame(function () {
            frameQueued = false;
            schedule();
        });
    }
    void queueActivity;
    panel.addEventListener("mouseenter", function () {
        hovering = true;
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
    });
    panel.addEventListener("mouseleave", function () {
        hovering = false;
        schedule();
    });
    panel.addEventListener("focusin", function () {
        focused = true;
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
    });
    panel.addEventListener("focusout", function () {
        focused = false;
        schedule();
    });
    window.addEventListener("pointerdown", function (event) {
        if (isMenuChrome(event.target)) {
            window.clearTimeout(timer);
            panel.classList.remove(DIM_CLASS);
            return;
        }
        queueActivity();
    });
    schedule();
}

// menu-bubble.js

const BUBBLE_STORAGE_KEY = "ag-bubble-pos";
const MARGIN = 12;
const TAP_MS = 300;
const TAP_PX = 8;
const SWIPE_VELOCITY = 0.45;
function initMenuBubble() {
    const bubble = document.querySelector("[data-menu-bubble]");
    const panel = document.querySelector("[data-menu]");
    if (!(bubble instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) {
        return;
    }
    detachPanelOnMobile(panel);
    wireDesktopNudge(bubble, panel);
    if (!supportsFinePointer()) {
        bubble.addEventListener("click", function () {
            togglePanel(bubble, panel);
        });
        return;
    }
    restorePosition(bubble);
    wireDrag(bubble, panel);
    wirePanelChrome(bubble, panel);
    window.addEventListener("resize", function () {
        constrainBubble(bubble);
    });
}
const MOBILE_QUERY = "(max-width: 56rem)";
// The stage carries a backdrop filter, which makes it the containing block for
// fixed descendants. On small screens the menu is a fixed panel, so it is moved
// out of the stage and back to the body where it stays inside the viewport.
function detachPanelOnMobile(panel) {
    const home = panel.parentElement;
    if (!home) {
        return;
    }
    const anchor = panel.nextElementSibling;
    const stage = home;
    function restore() {
        if (anchor && anchor.parentElement === stage) {
            stage.insertBefore(panel, anchor);
        }
        else {
            stage.appendChild(panel);
        }
        panel.classList.remove("is-detached");
    }
    function apply() {
        if (isMobileLayout()) {
            if (panel.parentElement !== document.body) {
                document.body.appendChild(panel);
                panel.classList.add("is-detached");
            }
            return;
        }
        restore();
    }
    if (typeof window.matchMedia !== "function") {
        return;
    }
    const query = window.matchMedia(MOBILE_QUERY);
    apply();
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", apply);
    }
}
function isMobileLayout() {
    if (typeof window.matchMedia !== "function") {
        return false;
    }
    return window.matchMedia(MOBILE_QUERY).matches;
}
function supportsFinePointer() {
    return typeof window.PointerEvent === "function";
}
function wireDrag(bubble, panel) {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let startTime = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocityX = 0;
    bubble.addEventListener("pointerdown", function (event) {
        dragging = true;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        lastX = event.clientX;
        lastTime = event.timeStamp;
        velocityX = 0;
        startTime = event.timeStamp;
        const rect = bubble.getBoundingClientRect();
        baseX = rect.left;
        baseY = rect.top;
        document.body.classList.add("is-dragging");
        panel.classList.add("is-dragging");
        bubble.setAttribute("data-dragging", "true");
        try {
            bubble.setPointerCapture(event.pointerId);
        }
        catch (err) {
            void err;
        }
    });
    bubble.addEventListener("pointermove", function (event) {
        if (!dragging) {
            return;
        }
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) > TAP_PX || Math.abs(dy) > TAP_PX) {
            moved = true;
        }
        const dt = event.timeStamp - lastTime;
        if (dt > 0) {
            velocityX = (event.clientX - lastX) / dt;
        }
        lastX = event.clientX;
        lastTime = event.timeStamp;
        positionBubble(bubble, baseX + dx, baseY + dy);
    });
    bubble.addEventListener("pointerup", function (event) {
        if (!dragging) {
            return;
        }
        dragging = false;
        document.body.classList.remove("is-dragging");
        panel.classList.remove("is-dragging");
        bubble.setAttribute("data-dragging", "false");
        const duration = event.timeStamp - startTime;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!moved && duration < TAP_MS && dist < TAP_PX) {
            togglePanel(bubble, panel);
            return;
        }
        if (moved) {
            if (shouldOpenFromSwipe(bubble, velocityX)) {
                snapBubble(bubble, true);
                openPanel(bubble, panel);
                return;
            }
            snapBubble(bubble, true);
            return;
        }
        snapBubble(bubble, false);
    });
    bubble.addEventListener("pointercancel", function () {
        dragging = false;
        document.body.classList.remove("is-dragging");
        panel.classList.remove("is-dragging");
        bubble.setAttribute("data-dragging", "false");
        snapBubble(bubble, true);
    });
}
function wirePanelChrome(bubble, panel) {
    panel.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closePanel(bubble, panel);
            bubble.focus();
        }
        if (event.key === "Tab") {
            trapTab(event, panel);
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && panel.classList.contains("is-open")) {
            closePanel(bubble, panel);
        }
    });
    document.addEventListener("pointerdown", function (event) {
        if (!panel.classList.contains("is-open")) {
            return;
        }
        const target = event.target;
        if (target && (panel.contains(target) || bubble.contains(target))) {
            return;
        }
        closePanel(bubble, panel);
    });
    window.addEventListener("scroll", function () {
        if (panel.classList.contains("is-open") && isTouchScroll()) {
            hideToCaret(bubble, panel);
        }
    }, { passive: true });
}
function wireDesktopNudge(bubble, panel) {
    if (window.matchMedia("(max-width: 56rem)").matches) {
        return;
    }
    bubble.addEventListener("mouseenter", function () {
        if (panel.classList.contains("is-open")) {
            return;
        }
        showDesktopNudge(bubble);
    });
    bubble.addEventListener("mouseleave", function () {
        hideDesktopNudge(bubble);
    });
    bubble.addEventListener("focus", function () {
        showDesktopNudge(bubble);
    });
    bubble.addEventListener("blur", function () {
        hideDesktopNudge(bubble);
    });
}
function showDesktopNudge(bubble) {
    let nudge = bubble.querySelector(".menu-bubble-nudge");
    if (nudge) {
        return;
    }
    nudge = document.createElement("span");
    nudge.className = "menu-bubble-nudge";
    nudge.textContent = "MENU";
    bubble.appendChild(nudge);
}
function hideDesktopNudge(bubble) {
    const nudge = bubble.querySelector(".menu-bubble-nudge");
    if (nudge) {
        nudge.remove();
    }
}
function restorePosition(bubble) {
    const saved = readLocalJson(BUBBLE_STORAGE_KEY);
    if (!saved) {
        dockBubble(bubble, "right");
        return;
    }
    positionBubble(bubble, saved.x, saved.y);
    dockBubble(bubble, saved.edge === "left" ? "left" : "right");
}
function bubbleSize(bubble) {
    const style = getComputedStyle(bubble);
    const width = parseFloat(style.width) || bubble.offsetWidth || 0;
    const height = parseFloat(style.height) || bubble.offsetHeight || 0;
    return { width, height };
}
function positionBubble(bubble, x, y) {
    const size = bubbleSize(bubble);
    const maxX = window.innerWidth - size.width - MARGIN;
    const maxY = window.innerHeight - size.height - MARGIN;
    const clampedX = clamp(x, MARGIN, Math.max(MARGIN, maxX));
    const clampedY = clamp(y, MARGIN, Math.max(MARGIN, maxY));
    bubble.style.position = "fixed";
    bubble.style.left = String(clampedX) + "px";
    bubble.style.top = String(clampedY) + "px";
    bubble.style.right = "auto";
    bubble.style.bottom = "auto";
}
function constrainBubble(bubble) {
    const rect = bubble.getBoundingClientRect();
    positionBubble(bubble, rect.left, rect.top);
}
function snapBubble(bubble, persist) {
    const rect = bubble.getBoundingClientRect();
    const middle = window.innerWidth / 2;
    const edge = rect.left + rect.width / 2 < middle ? "left" : "right";
    dockBubble(bubble, edge);
    if (persist) {
        const settled = bubble.getBoundingClientRect();
        const pos = { x: settled.left, y: settled.top, edge: edge };
        writeLocalJson(BUBBLE_STORAGE_KEY, pos);
    }
}
function dockBubble(bubble, edge) {
    const panel = document.querySelector("[data-menu]");
    if (edge === "left") {
        bubble.classList.add("is-left");
        if (panel instanceof HTMLElement) {
            panel.classList.add("is-left");
        }
    }
    else {
        bubble.classList.remove("is-left");
        if (panel instanceof HTMLElement) {
            panel.classList.remove("is-left");
        }
    }
    swapBubbleIcon(bubble, edge);
    const size = bubbleSize(bubble);
    const rect = bubble.getBoundingClientRect();
    const x = edge === "left" ? 0 : window.innerWidth - size.width;
    const maxY = Math.max(MARGIN, window.innerHeight - size.height - MARGIN);
    const y = clamp(rect.top, MARGIN, maxY);
    positionBubble(bubble, x, y);
}
function swapBubbleIcon(bubble, edge) {
    const use = bubble.querySelector("use");
    if (!use) {
        return;
    }
    if (edge === "left") {
        use.setAttribute("href", "#icon-death");
    }
    else {
        use.setAttribute("href", "#icon-biohazard");
    }
}
function shouldOpenFromSwipe(bubble, velocityX) {
    const onRight = !bubble.classList.contains("is-left");
    const onLeft = bubble.classList.contains("is-left");
    if (onRight && velocityX < -SWIPE_VELOCITY) {
        return true;
    }
    if (onLeft && velocityX > SWIPE_VELOCITY) {
        return true;
    }
    return false;
}
function togglePanel(bubble, panel) {
    if (panel.classList.contains("is-open")) {
        closePanel(bubble, panel);
    }
    else {
        openPanel(bubble, panel);
    }
}
function openPanel(bubble, panel) {
    panel.classList.add("is-open");
    panel.classList.remove("is-hidden");
    bubble.classList.remove("is-hidden");
    bubble.setAttribute("aria-expanded", "true");
    bubble.setAttribute("aria-label", "Close site menu");
    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";
    const first = panel.querySelector("a, button, input");
    if (first instanceof HTMLElement) {
        first.focus();
    }
}
function closePanel(bubble, panel) {
    const hadFocus = panel.contains(document.activeElement);
    panel.classList.remove("is-open");
    bubble.classList.remove("is-hidden");
    bubble.setAttribute("aria-expanded", "false");
    bubble.setAttribute("aria-label", "Open site menu");
    document.body.classList.remove("menu-open");
    document.body.style.overflow = "";
    if (hadFocus) {
        bubble.focus();
    }
}
function hideToCaret(bubble, panel) {
    panel.classList.remove("is-open");
    bubble.classList.add("is-hidden");
    bubble.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    document.body.style.overflow = "";
}
function trapTab(event, panel) {
    const focusables = visibleFocusables(panel);
    if (focusables.length === 0) {
        return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) {
        return;
    }
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    }
    else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
// Only the controls a visitor can actually see take part in the focus trap.
// A collapsed branch and a hidden panel hold links that must not be tabbed
// into, and a trap built on them would jump the focus into the dark.
function visibleFocusables(panel) {
    const all = panel.querySelectorAll("a[href], button, input, select, textarea");
    const out = [];
    all.forEach(function (el) {
        if (el instanceof HTMLElement && isReachable(el)) {
            out.push(el);
        }
    });
    return out;
}
function isReachable(el) {
    if (el.closest("[hidden]")) {
        return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
        return false;
    }
    return el.getClientRects().length > 0;
}
function isTouchScroll() {
    return window.matchMedia("(pointer: coarse)").matches;
}
function clamp(value, min, max) {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}

// playground-menu.js

const UNROLL_MS = 320;
const OVERSHOOT_BEZIER = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EDGE_MARGIN = 12;
function initPlaygroundMenu() {
    const nav = document.querySelector("[data-menu-top]");
    if (!(nav instanceof HTMLElement)) {
        return;
    }
    upgradeTree(nav);
    nav.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeEveryOpenGroup(nav, true);
        }
    });
    document.addEventListener("pointerdown", function (event) {
        const target = event.target;
        if (target && nav.contains(target)) {
            return;
        }
        closeEveryOpenGroup(nav, false);
    });
}
// The build emits native details elements so the menu works without script.
// Scripting turns every one of them into a toggle button plus a hidden group
// that unrolls downward with a pop bounce.
function upgradeTree(root) {
    const items = root.querySelectorAll("li.menu-top-item");
    items.forEach(function (item) {
        if (!(item instanceof HTMLElement) || item.hasAttribute("data-menu-top-upgraded")) {
            return;
        }
        upgradeItem(item);
    });
}
function upgradeItem(item) {
    const details = item.querySelector(":scope > details.menu-top-details");
    if (!(details instanceof HTMLDetailsElement)) {
        return;
    }
    const summary = details.querySelector(":scope > summary.menu-top-branch");
    const childList = details.querySelector(":scope > ul.menu-top-drop, :scope > ul.menu-top-sub");
    if (!summary || !(childList instanceof HTMLElement)) {
        return;
    }
    const labelText = (summary.textContent || "").trim();
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.classList.add("menu-top-branch");
    toggle.textContent = labelText;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Toggle " + labelText + " submenu");
    toggle.dataset.menuTopToggle = "true";
    const groupId = "menu-top-group-" + groupIdCounter();
    childList.id = groupId;
    toggle.setAttribute("aria-controls", groupId);
    // The summary lives inside the details, so the toggle has to become a
    // sibling of the details; replacing the summary in place would carry the
    // button away when the details element is dropped.
    item.insertBefore(toggle, details);
    item.insertBefore(childList, details);
    summary.remove();
    details.remove();
    childList.setAttribute("data-menu-top-group", labelText);
    childList.hidden = true;
    setGroupOpen(toggle, childList, false, false);
    toggle.addEventListener("click", function () {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        closeSiblings(item);
        setGroupOpen(toggle, childList, !expanded, true);
    });
    item.setAttribute("data-menu-top-upgraded", "true");
    upgradeTree(item);
}
let groupCounter = 0;
function groupIdCounter() {
    groupCounter += 1;
    return String(groupCounter);
}
// Opening one drawer closes the other drawers in the same list, so the bar
// never ladders several panels over the game at once.
function closeSiblings(item) {
    const parent = item.parentElement;
    if (!parent) {
        return;
    }
    Array.prototype.forEach.call(parent.children, function (sibling) {
        if (!(sibling instanceof HTMLElement) || sibling === item) {
            return;
        }
        closeEveryOpenGroup(sibling, false);
    });
}
function closeEveryOpenGroup(scope, refocus) {
    const openToggles = scope.querySelectorAll('button[data-menu-top-toggle][aria-expanded="true"]');
    const toggles = [];
    openToggles.forEach(function (toggle) {
        if (toggle instanceof HTMLButtonElement) {
            toggles.push(toggle);
        }
    });
    for (let i = 0; i < toggles.length; i += 1) {
        const toggle = toggles[i];
        if (!toggle) {
            continue;
        }
        const group = groupForToggle(toggle);
        if (group) {
            setGroupOpen(toggle, group, false, true);
        }
    }
    const lastToggle = toggles.length > 0 ? toggles[toggles.length - 1] : null;
    const nav = scope.closest("[data-menu-top]");
    if (refocus && lastToggle instanceof HTMLButtonElement && nav && nav.contains(document.activeElement) && !lastToggle.contains(document.activeElement)) {
        lastToggle.focus();
    }
}
function groupForToggle(toggle) {
    const item = toggle.closest("li.menu-top-item");
    if (!item) {
        return null;
    }
    const group = item.querySelector(":scope > [data-menu-top-group]");
    return group instanceof HTMLElement ? group : null;
}
// The unroll: the group's height grows to its content with an overshooting
// curve while a short scaleY pop plays on the panel itself. Reduced motion
// skips both and the drawer simply appears.
function setGroupOpen(toggle, group, open, animate) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) {
        collapseGroup(group, animate);
        return;
    }
    expandGroup(group, animate);
}
function expandGroup(group, animate) {
    group.hidden = false;
    group.style.overflow = "hidden";
    const floating = group.classList.contains("menu-top-drop");
    const content = fullHeight(group);
    const target = floating ? Math.min(content, availableHeight(group)) : content;
    flipSide(group, floating);
    if (!animate || prefersReducedMotion()) {
        group.style.maxHeight = target < content ? target + "px" : "";
        group.style.overflow = floating ? "auto" : "";
        return;
    }
    group.style.maxHeight = "0";
    void group.offsetHeight;
    group.style.transition = "max-height " + UNROLL_MS + "ms " + OVERSHOOT_BEZIER;
    group.style.maxHeight = target + "px";
    group.setAttribute("data-open", "true");
    window.setTimeout(function () {
        if (group.hidden || group.getAttribute("data-open") !== "true") {
            return;
        }
        group.style.transition = "";
        if (floating) {
            group.style.overflow = "auto";
        }
        else {
            group.style.maxHeight = "";
            group.style.overflow = "";
        }
    }, UNROLL_MS + 40);
}
function collapseGroup(group, animate) {
    group.removeAttribute("data-open");
    if (group.hidden) {
        group.style.maxHeight = "0";
        return;
    }
    if (!animate || prefersReducedMotion()) {
        group.hidden = true;
        group.style.transition = "";
        group.style.maxHeight = "0";
        group.style.overflow = "hidden";
        return;
    }
    group.style.overflow = "hidden";
    group.style.maxHeight = group.scrollHeight + "px";
    void group.offsetHeight;
    group.style.transition = "max-height " + UNROLL_MS + "ms ease";
    group.style.maxHeight = "0";
    window.setTimeout(function () {
        group.hidden = true;
        group.style.transition = "";
        group.style.maxHeight = "0";
        flipSide(group, false);
    }, UNROLL_MS + 20);
}
function fullHeight(group) {
    const saved = group.style.maxHeight;
    group.style.maxHeight = "";
    const height = group.scrollHeight;
    group.style.maxHeight = saved;
    return height;
}
function availableHeight(group) {
    const rect = group.getBoundingClientRect();
    return window.innerHeight - rect.top - EDGE_MARGIN;
}
// A panel that would run past the right edge of the window anchors to the
// right side of its branch instead.
function flipSide(group, flip) {
    if (!flip) {
        group.classList.remove("is-right");
        return;
    }
    const rect = group.getBoundingClientRect();
    if (rect.right > window.innerWidth - EDGE_MARGIN) {
        group.classList.add("is-right");
    }
}

// transitions.js

const INCOMING_KEY = "ag-transition-incoming";
const MARKER_KEY = "ag-menu-marker";
const SHAKE_MS = 200;
const TRANSITION_DROP_MS = 700;
const OUTGOING_MS = 900;
function initTransitions() {
    playIncomingBeat();
    wireOutgoingBeat();
    glideMenuMarker();
}
function playIncomingBeat() {
    const flag = readSessionString(INCOMING_KEY);
    if (!flag) {
        return;
    }
    try {
        window.sessionStorage.removeItem(INCOMING_KEY);
    }
    catch (err) {
        void err;
    }
    if (prefersReducedMotion()) {
        return;
    }
    const title = document.querySelector("[data-title-box]");
    const main = document.querySelector("[data-main-box]");
    if (!(title instanceof HTMLElement) || !(main instanceof HTMLElement)) {
        return;
    }
    title.classList.add("is-entering");
    main.classList.add("is-entering");
    window.setTimeout(function () {
        title.classList.remove("is-entering");
        main.classList.remove("is-entering");
    }, OUTGOING_MS);
}
function wireOutgoingBeat() {
    document.addEventListener("click", function (event) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const link = target.closest("a");
        if (!(link instanceof HTMLAnchorElement)) {
            return;
        }
        const href = link.getAttribute("href") || "";
        if (!shouldIntercept(link, href, event)) {
            return;
        }
        recordMarkerRect(link);
        if (prefersReducedMotion()) {
            return;
        }
        event.preventDefault();
        const title = document.querySelector("[data-title-box]");
        const main = document.querySelector("[data-main-box]");
        if (title instanceof HTMLElement) {
            title.classList.add("is-leaving");
        }
        if (main instanceof HTMLElement) {
            main.classList.add("is-leaving");
        }
        writeSessionString(INCOMING_KEY, "1");
        window.setTimeout(function () {
            window.location.href = link.href;
        }, totalBudget());
    });
}
function totalBudget() {
    return SHAKE_MS + TRANSITION_DROP_MS + 50;
}
function shouldIntercept(link, href, event) {
    if (event.button === 1 || event.button === 2) {
        return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return false;
    }
    if (link.target === "_blank") {
        return false;
    }
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return false;
    }
    if (href.startsWith("http") && !isSameSiteUrl(href)) {
        return false;
    }
    if (!isSameSiteUrl(link.href)) {
        return false;
    }
    if (link.hasAttribute("download")) {
        return false;
    }
    if (isDownloadHref(href)) {
        return false;
    }
    return true;
}
function recordMarkerRect(link) {
    try {
        const rect = link.getBoundingClientRect();
        window.sessionStorage.setItem(MARKER_KEY, JSON.stringify({ top: rect.top, height: rect.height }));
    }
    catch (err) {
        void err;
    }
}
function glideMenuMarker() {
    const nav = document.querySelector("[data-menu]");
    const active = document.querySelector("a.menu-link[aria-current='page']");
    if (!(nav instanceof HTMLElement) || !(active instanceof HTMLElement)) {
        return;
    }
    if (prefersReducedMotion()) {
        return;
    }
    const marker = document.createElement("span");
    marker.className = "menu-marker";
    marker.setAttribute("aria-hidden", "true");
    if (getComputedStyle(nav).position === "static") {
        nav.style.position = "relative";
    }
    nav.appendChild(marker);
    const from = readMarkerRect();
    const to = active.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const fromTop = from.top - navRect.top;
    const toTop = to.top - navRect.top;
    marker.style.transform = "translateY(" + String(fromTop) + "px)";
    marker.style.height = String(Math.max(8, from.height)) + "px";
    window.requestAnimationFrame(function () {
        marker.style.transition = "transform 300ms ease, height 300ms ease";
        marker.style.transform = "translateY(" + String(toTop) + "px)";
        marker.style.height = String(Math.max(8, to.height)) + "px";
    });
    window.setTimeout(function () {
        marker.remove();
    }, 1200);
}
function readMarkerRect() {
    try {
        const raw = window.sessionStorage.getItem(MARKER_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.top === "number" && typeof parsed.height === "number") {
                return { top: parsed.top, height: parsed.height };
            }
        }
    }
    catch (err) {
        void err;
    }
    return { top: 0, height: 24 };
}

// lens.js

const ZOOM = 3;
function lensMax() {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue("--lens-max").trim();
    return value.length > 0 ? parseFloat(value) : 1420;
}
function initLens() {
    const lens = document.querySelector("[data-lens]");
    if (!(lens instanceof HTMLElement)) {
        return;
    }
    if (!hasFinePointer()) {
        return;
    }
    if (prefersReducedMotion()) {
        return;
    }
    lens.style.pointerEvents = "none";
    let rafQueued = false;
    let lastX = 0;
    let lastY = 0;
    let activeImage = null;
    let lensX = 0;
    let lensY = 0;
    document.addEventListener("pointermove", function (event) {
        lastX = event.clientX;
        lastY = event.clientY;
        if (isOverHero(event.clientX, event.clientY) || isLightboxOpen() || isIntroCovering()) {
            hideLens(lens);
            activeImage = null;
            return;
        }
        const img = findZoomImage(event.target);
        if (!img) {
            hideLens(lens);
            activeImage = null;
            return;
        }
        activeImage = img;
        preloadFullImage(img);
        if (!rafQueued) {
            rafQueued = true;
            onNextFrame(function () {
                rafQueued = false;
                if (activeImage) {
                    moveLens(lens, activeImage, lastX, lastY);
                }
            });
        }
    });
    document.addEventListener("scroll", function () {
        hideLens(lens);
        activeImage = null;
    }, { passive: true });
    window.addEventListener("blur", function () {
        hideLens(lens);
        activeImage = null;
    });
    document.addEventListener("pointerleave", function () {
        hideLens(lens);
        activeImage = null;
    });
}
function isOverHero(clientX, clientY) {
    const hero = document.querySelector("[data-hero-strip]");
    if (!(hero instanceof HTMLElement)) {
        return false;
    }
    const rect = hero.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}
function isLightboxOpen() {
    return document.body.classList.contains("lightbox-open");
}
// While the intro gate veil or the weaving itself covers the page, the boxes
// underneath are invisible; magnifying them would only break the scene.
function isIntroCovering() {
    const gate = document.querySelector(".hero-gate:not(.is-dismissed)");
    if (gate) {
        return true;
    }
    const hero = document.querySelector("[data-hero-anim]");
    if (!(hero instanceof HTMLElement)) {
        return false;
    }
    const state = hero.getAttribute("data-hero-state");
    return state !== null && state !== "done";
}
function findZoomImage(target) {
    if (!(target instanceof Element)) {
        return null;
    }
    if (isMenuChrome(target)) {
        return null;
    }
    const img = target.closest("img");
    if (!(img instanceof HTMLImageElement)) {
        return null;
    }
    if (!isZoomable(img)) {
        return null;
    }
    return img;
}
function isZoomable(img) {
    if (img.closest("[data-hero-strip]")) {
        return false;
    }
    if (img.closest("[data-lightbox]")) {
        return false;
    }
    if (img.closest(".site-footer")) {
        return false;
    }
    if (img.closest(".hero-gate")) {
        return false;
    }
    if (img.classList.contains("logo-ball")) {
        return false;
    }
    if (isMenuChrome(img)) {
        return false;
    }
    return true;
}
function moveLens(lens, img, clientX, clientY) {
    const size = lensSize();
    lens.style.width = String(size) + "px";
    lens.style.height = String(size) + "px";
    lens.style.setProperty("--x", String(clientX) + "px");
    lens.style.setProperty("--y", String(clientY) + "px");
    const rect = img.getBoundingClientRect();
    const relX = (clientX - rect.left) / Math.max(1, rect.width);
    const relY = (clientY - rect.top) / Math.max(1, rect.height);
    const half = size / 2;
    const bgX = -(relX * rect.width * ZOOM - half);
    const bgY = -(relY * rect.height * ZOOM - half);
    const src = img.currentSrc || img.src;
    if (src) {
        lens.style.backgroundImage = "url(\"" + src + "\")";
    }
    lens.style.backgroundSize = String(rect.width * ZOOM) + "px " + String(rect.height * ZOOM) + "px";
    lens.style.backgroundPosition = String(bgX) + "px " + String(bgY) + "px";
    lens.classList.add("is-visible");
}
function lensSize() {
    const size = window.innerWidth * 0.1;
    return Math.min(size, lensMax());
}
function preloadFullImage(img) {
    const src = img.currentSrc || img.src;
    if (!src) {
        return;
    }
    if (img.dataset["lensPreloaded"] === "true") {
        return;
    }
    img.dataset["lensPreloaded"] = "true";
    const loader = new Image();
    loader.src = src;
}
function hideLens(lens) {
    lens.classList.remove("is-visible");
}

// glow.js

function glowMax() {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue("--glow-max").trim();
    return value.length > 0 ? parseFloat(value) : 70;
}
function initGlow() {
    const glowEl = document.querySelector("[data-glow]");
    if (!(glowEl instanceof HTMLElement)) {
        return;
    }
    const glow = glowEl;
    if (!hasFinePointer()) {
        return;
    }
    if (prefersReducedMotion()) {
        return;
    }
    glow.style.pointerEvents = "none";
    let targetX = 0;
    let targetY = 0;
    let glowX = 0;
    let glowY = 0;
    let visible = false;
    let running = false;
    let idleTimer = 0;
    document.addEventListener("pointermove", function (event) {
        if (shouldSkip(event.target)) {
            setVisible(false);
            pauseLoop();
            return;
        }
        targetX = event.clientX;
        targetY = event.clientY;
        if (!visible) {
            glowX = targetX;
            glowY = targetY;
            setVisible(true);
        }
        startLoop();
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(pauseLoop, 1200);
    });
    document.addEventListener("scroll", function () {
        setVisible(false);
        pauseLoop();
    }, { passive: true });
    window.addEventListener("blur", function () {
        setVisible(false);
        pauseLoop();
    });
    function setVisible(next) {
        visible = next;
        if (next) {
            glow.classList.add("is-visible");
        }
        else {
            glow.classList.remove("is-visible");
        }
    }
    function startLoop() {
        if (running) {
            return;
        }
        running = true;
        step();
    }
    function pauseLoop() {
        running = false;
    }
    function step() {
        if (!running) {
            return;
        }
        glowX = glowX + (targetX - glowX) * 0.22;
        glowY = glowY + (targetY - glowY) * 0.22;
        const size = glowSize();
        const half = size / 2;
        glow.style.width = String(size) + "px";
        glow.style.height = String(size) + "px";
        glow.style.setProperty("--x", String(glowX) + "px");
        glow.style.setProperty("--y", String(glowY) + "px");
        window.requestAnimationFrame(step);
    }
}
function shouldSkip(target) {
    if (isMenuChrome(target)) {
        return true;
    }
    if (isEditableTarget(target)) {
        return true;
    }
    if (target instanceof Element && target.closest("[data-dragging='true']")) {
        return true;
    }
    if (document.body.classList.contains("is-dragging")) {
        return true;
    }
    return false;
}
function glowSize() {
    const size = window.innerWidth * 0.05;
    return Math.min(size, glowMax());
}

// lightbox.js
const LIGHTBOX_SELECTOR = "[data-lightbox]";
let overlay = null;
let frameImage = null;
let closeButton = null;
let opener = null;
function initLightbox() {
    overlay = document.querySelector(LIGHTBOX_SELECTOR);
    if (!(overlay instanceof HTMLElement)) {
        return;
    }
    frameImage = overlay.querySelector("[data-lightbox-image]");
    closeButton = overlay.querySelector("[data-lightbox-close]");
    if (!(frameImage instanceof HTMLImageElement)) {
        return;
    }
    if (!(closeButton instanceof HTMLButtonElement)) {
        return;
    }
    document.addEventListener("click", onPageClick);
    document.addEventListener("keydown", onPageKeydown);
    closeButton.addEventListener("click", closeLightbox);
    frameImage.addEventListener("click", closeLightbox);
    const backdrop = overlay.querySelector("[data-lightbox-backdrop]");
    if (backdrop) {
        backdrop.addEventListener("click", closeLightbox);
    }
    markImages(document);
    watchForImages();
}
function onPageClick(event) {
    if (!overlay || !overlay.hidden) {
        return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    if (overlay.contains(target)) {
        return;
    }
    const img = target.closest("img");
    if (!(img instanceof HTMLImageElement)) {
        return;
    }
    if (!isLightboxImage(img)) {
        return;
    }
    openLightbox(img);
}
function onPageKeydown(event) {
    if (overlay && !overlay.hidden) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeLightbox();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            if (closeButton) {
                closeButton.focus();
            }
        }
        return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const img = target.closest("img");
    if (!(img instanceof HTMLImageElement)) {
        return;
    }
    if (!isLightboxImage(img)) {
        return;
    }
    event.preventDefault();
    openLightbox(img);
}
function openLightbox(img) {
    if (!overlay || !frameImage) {
        return;
    }
    const src = img.currentSrc || img.src;
    if (!src) {
        return;
    }
    frameImage.src = src;
    frameImage.alt = img.alt || "";
    opener = img;
    overlay.hidden = false;
    document.body.classList.add("lightbox-open");
    if (closeButton) {
        closeButton.focus();
    }
}
function closeLightbox() {
    if (!overlay || overlay.hidden) {
        return;
    }
    overlay.hidden = true;
    document.body.classList.remove("lightbox-open");
    const target = opener;
    opener = null;
    if (target && target.isConnected) {
        target.focus();
    }
}
function isLightboxImage(img) {
    if (img.closest("[data-lightbox]")) {
        return false;
    }
    if (img.closest("[data-hero-strip]")) {
        return false;
    }
    if (img.closest(".site-footer")) {
        return false;
    }
    // The gate veil and the parked ball run their own choreography; a zoom
    // dialog opening over them would hide the animation it belongs to.
    if (img.closest(".hero-gate")) {
        return false;
    }
    if (img.classList.contains("logo-ball")) {
        return false;
    }
    if (img.classList.contains("err-spider")) {
        return false;
    }
    if (img.dataset["lightbox"] === "off") {
        return false;
    }
    return true;
}
function markImages(root) {
    const images = root.querySelectorAll("img");
    images.forEach(function (element) {
        if (!(element instanceof HTMLImageElement)) {
            return;
        }
        if (!isLightboxImage(element)) {
            return;
        }
        if (element.dataset["lightboxReady"] === "true") {
            return;
        }
        element.dataset["lightboxReady"] = "true";
        element.setAttribute("tabindex", "0");
        element.setAttribute("role", "button");
        element.setAttribute("aria-haspopup", "dialog");
    });
}
function watchForImages() {
    const main = document.querySelector("[data-main-box]");
    if (!main) {
        return;
    }
    const observer = new MutationObserver(function () {
        markImages(main);
    });
    observer.observe(main, { childList: true, subtree: true });
}

// carousel.js

function initCarousel() {
    upgradeMediaRows();
    wireCarousels();
}
function upgradeMediaRows() {
    const rows = document.querySelectorAll(".media-row, .feature-media, .story-media");
    rows.forEach(function (row, index) {
        if (!(row instanceof HTMLElement)) {
            return;
        }
        const figures = row.querySelectorAll("figure");
        if (figures.length <= 2) {
            return;
        }
        if (row.closest(".carousel")) {
            return;
        }
        buildCarousel(row, index);
    });
}
function buildCarousel(row, index) {
    const figures = [];
    row.querySelectorAll("figure").forEach(function (fig) {
        if (fig instanceof HTMLElement) {
            figures.push(fig);
        }
    });
    const region = document.createElement("div");
    region.className = "carousel";
    region.setAttribute("role", "region");
    region.setAttribute("aria-roledescription", "carousel");
    region.setAttribute("aria-label", row.getAttribute("data-carousel-label") || "Image carousel");
    region.setAttribute("tabindex", "0");
    const autoplay = row.getAttribute("data-autoplay");
    if (autoplay !== null) {
        region.setAttribute("data-autoplay", autoplay);
    }
    const track = document.createElement("div");
    track.className = "carousel-track";
    for (let i = 0; i < figures.length; i = i + 1) {
        const figure = figures[i];
        if (!figure) {
            continue;
        }
        const slide = document.createElement("div");
        slide.className = "carousel-slide";
        const slideId = "carousel-slide-" + index + "-" + String(i);
        slide.setAttribute("id", slideId);
        slide.setAttribute("role", "tabpanel");
        slide.setAttribute("aria-labelledby", "carousel-tab-" + index + "-" + String(i));
        slide.appendChild(figure);
        track.appendChild(slide);
    }
    region.appendChild(track);
    const parent = row.parentElement;
    if (parent) {
        parent.replaceChild(region, row);
    }
}
function wireCarousels() {
    const carousels = document.querySelectorAll(".carousel");
    carousels.forEach(function (root, index) {
        if (root instanceof HTMLElement) {
            wireOne(root, index);
        }
    });
}
function wireOne(root, index) {
    const trackEl = root.querySelector(".carousel-track");
    const slides = root.querySelectorAll(".carousel-slide");
    if (!(trackEl instanceof HTMLElement) || slides.length === 0) {
        return;
    }
    ensureFocusable(root);
    const track = trackEl;
    const label = root.getAttribute("aria-label") || "Carousel " + String(index + 1);
    let current = 0;
    const live = document.createElement("p");
    live.className = "carousel-status";
    live.setAttribute("aria-live", "polite");
    root.appendChild(live);
    const prev = ensureButton(root, "carousel-prev", "Previous slide", "Previous");
    const next = ensureButton(root, "carousel-next", "Next slide", "Next");
    const slideIds = prepareSlides(root, index);
    const dotsHost = ensureDots(root, slides.length, slideIds, index);
    const dots = dotsHost.querySelectorAll(".carousel-dot");
    prev.addEventListener("click", function () {
        current = showSlide(track, slides, dots, live, label, current - 1);
        restartAutoplay();
    });
    next.addEventListener("click", function () {
        current = showSlide(track, slides, dots, live, label, current + 1);
        restartAutoplay();
    });
    dots.forEach(function (dot, dotIndex) {
        dot.addEventListener("click", function () {
            current = showSlide(track, slides, dots, live, label, dotIndex);
            restartAutoplay();
        });
    });
    root.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            current = showSlide(track, slides, dots, live, label, current - 1);
            restartAutoplay();
        }
        else if (event.key === "ArrowRight") {
            event.preventDefault();
            current = showSlide(track, slides, dots, live, label, current + 1);
            restartAutoplay();
        }
        else if (event.key === "Home") {
            event.preventDefault();
            current = showSlide(track, slides, dots, live, label, 0);
            restartAutoplay();
        }
        else if (event.key === "End") {
            event.preventDefault();
            current = showSlide(track, slides, dots, live, label, slides.length - 1);
            restartAutoplay();
        }
    });
    showSlide(track, slides, dots, live, label, 0);
    let autoTimer = 0;
    const autoplay = root.getAttribute("data-autoplay");
    if (autoplay !== null && !prefersReducedMotion()) {
        startAutoplay();
    }
    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", startAutoplay);
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopAutoplay();
        }
        else {
            startAutoplay();
        }
    });
    function startAutoplay() {
        if (autoplay === null) {
            return;
        }
        stopAutoplay();
        autoTimer = window.setTimeout(function () {
            if (document.hidden) {
                return;
            }
            current = showSlide(track, slides, dots, live, label, current + 1);
            startAutoplay();
        }, 6000);
    }
    function stopAutoplay() {
        window.clearTimeout(autoTimer);
    }
    function restartAutoplay() {
        if (autoplay === null) {
            return;
        }
        startAutoplay();
    }
}
// Every slide is a tab panel. The markup may be written by hand, so the
// roles and the ids are repaired here.
function prepareSlides(root, index) {
    const slides = root.querySelectorAll(".carousel-slide");
    const ids = [];
    slides.forEach(function (slide, position) {
        if (!(slide instanceof HTMLElement)) {
            return;
        }
        const slideId = slide.getAttribute("id") || "carousel-slide-" + index + "-" + String(position);
        slide.setAttribute("id", slideId);
        slide.setAttribute("role", "tabpanel");
        slide.setAttribute("aria-labelledby", "carousel-tab-" + index + "-" + String(position));
        ids.push(slideId);
    });
    return ids;
}
// The region carries the arrow keys, so it has to be reachable with the
// keyboard even when the markup was written by hand.
function ensureFocusable(root) {
    if (!root.hasAttribute("tabindex")) {
        root.setAttribute("tabindex", "0");
    }
}
function ensureButton(root, className, label, text) {
    const existing = root.querySelector("." + className);
    if (existing instanceof HTMLButtonElement) {
        return existing;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.textContent = text;
    root.appendChild(button);
    return button;
}
function ensureDots(root, count, slideIds, tabIndex) {
    const existing = root.querySelector(".carousel-dots");
    if (existing instanceof HTMLElement && existing.querySelectorAll(".carousel-dot").length === count) {
        return normalizeDots(existing, slideIds, tabIndex);
    }
    if (existing instanceof HTMLElement) {
        existing.remove();
    }
    const host = document.createElement("div");
    host.className = "carousel-dots";
    host.setAttribute("role", "tablist");
    host.setAttribute("aria-label", "Slide dots");
    for (let i = 0; i < count; i = i + 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.id = "carousel-tab-" + tabIndex + "-" + String(i);
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
        dot.setAttribute("aria-label", "Go to slide " + String(i + 1));
        if (slideIds[i]) {
            dot.setAttribute("aria-controls", slideIds[i]);
        }
        dot.tabIndex = i === 0 ? 0 : -1;
        host.appendChild(dot);
    }
    root.appendChild(host);
    return normalizeDots(host, slideIds, tabIndex);
}
// A dot is the tab that shows one slide, so it needs the id of the panel it
// controls. Hand written markup gets the same treatment as generated markup.
function normalizeDots(host, slideIds, tabIndex) {
    const dots = host.querySelectorAll(".carousel-dot");
    dots.forEach(function (dot, position) {
        if (!(dot instanceof HTMLElement)) {
            return;
        }
        dot.id = "carousel-tab-" + tabIndex + "-" + String(position);
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Go to slide " + String(position + 1));
        if (slideIds[position]) {
            dot.setAttribute("aria-controls", slideIds[position]);
        }
        if (!dot.hasAttribute("aria-selected")) {
            dot.setAttribute("aria-selected", position === 0 ? "true" : "false");
        }
        dot.tabIndex = position === 0 ? 0 : -1;
    });
    return host;
}
function showSlide(track, slides, dots, live, label, next) {
    const count = slides.length;
    if (count === 0) {
        return 0;
    }
    let current = next;
    if (current < 0) {
        current = count - 1;
    }
    if (current >= count) {
        current = 0;
    }
    const offset = current * 100;
    track.style.transform = "translateX(-" + String(offset) + "%)";
    dots.forEach(function (dot, dotIndex) {
        dot.setAttribute("aria-selected", dotIndex === current ? "true" : "false");
        if (dot instanceof HTMLElement) {
            dot.tabIndex = dotIndex === current ? 0 : -1;
        }
    });
    slides.forEach(function (slide, slideIndex) {
        if (slideIndex === current) {
            slide.removeAttribute("aria-hidden");
            return;
        }
        slide.setAttribute("aria-hidden", "true");
    });
    live.textContent = label + ": slide " + String(current + 1) + " of " + String(count) + ".";
    return current;
}

// cookies.js

const COOKIE_STORAGE_KEY = "ag-cookie-consent";
const COOKIE_CONSENT_VERSION = 1;
const CONSENT_ATTRIBUTE = "data-cookie";
function initCookies() {
    const banner = document.querySelector("[data-cookie-banner]");
    if (!(banner instanceof HTMLElement)) {
        return;
    }
    const ok = banner.querySelector("[data-cookie-ok]");
    const exit = banner.querySelector("[data-cookie-exit]");
    const record = readConsent();
    if (record.choice === "unset") {
        banner.classList.add("is-visible");
    }
    if (ok instanceof HTMLButtonElement) {
        ok.addEventListener("click", function () {
            saveConsent("accepted");
            hideBanner(banner);
        });
    }
    if (exit instanceof HTMLButtonElement) {
        exit.addEventListener("click", function () {
            saveConsent("declined");
            hideBanner(banner);
        });
    }
    wireSettingsLink(banner);
}
// The banner is visible by default so it also reaches a visitor without
// scripting. The pre-paint snippet marks the document as decided, and this
// hides the banner again once a choice has been stored.
function hideBanner(banner) {
    banner.classList.remove("is-visible");
    document.documentElement.setAttribute(CONSENT_ATTRIBUTE, "set");
}
function showBanner(banner) {
    banner.classList.add("is-visible");
}
function readConsent() {
    const raw = readLocalString(COOKIE_STORAGE_KEY);
    if (!raw) {
        return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
    }
    try {
        const parsed = JSON.parse(raw);
        if ((parsed.choice === "accepted" || parsed.choice === "declined") &&
            parsed.version === COOKIE_CONSENT_VERSION) {
            return {
                choice: parsed.choice,
                version: parsed.version,
                updatedAt: parsed.updatedAt || "",
            };
        }
        return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
    }
    catch (err) {
        void err;
        const trimmed = raw.trim();
        if (trimmed === "accepted" || trimmed === "declined" || trimmed === "unset") {
            return { choice: trimmed, version: COOKIE_CONSENT_VERSION, updatedAt: "" };
        }
        return { choice: "unset", version: COOKIE_CONSENT_VERSION, updatedAt: "" };
    }
}
function saveConsent(choice) {
    const record = {
        choice: choice,
        version: COOKIE_CONSENT_VERSION,
        updatedAt: new Date().toISOString(),
    };
    writeLocalString(COOKIE_STORAGE_KEY, JSON.stringify(record));
}
function wireSettingsLink(banner) {
    const links = document.querySelectorAll("[data-cookie-settings]");
    links.forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            showBanner(banner);
            const ok = banner.querySelector("[data-cookie-ok]");
            if (ok instanceof HTMLElement) {
                ok.focus();
            }
        });
    });
}

// theme.js

const THEME_STORAGE_KEY = "ag-theme";
const THEME_STORAGE_VERSION = 3;
const THEME_CROSSFADE_MS = 340;
const HERO_FORWARD = "hero-web-layer-forward";
const HERO_RETURN = "hero-web-layer-return";
let systemQuery = null;
let systemListener = null;
let activeMode = "system";
function initTheme() {
    const root = document.documentElement;
    activeMode = readMode();
    if (activeMode === "system") {
        forgetStoredMode();
    }
    applyTheme(root, resolveMode(activeMode), false);
    if (activeMode === "system") {
        watchSystemTheme(root);
    }
    syncThemeControls(root);
    wirePill(root);
    wireThemeMessaging(root);
}
function currentTheme(root = document.documentElement) {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
}
function currentMode() {
    return activeMode;
}
// The site follows the system setting until the visitor picks a theme. A
// record written by an older version of the site is not a choice any more,
// so it is dropped and the system takes over again.
function readMode() {
    const raw = readLocalString(THEME_STORAGE_KEY);
    if (!raw) {
        return "system";
    }
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    }
    catch (err) {
        void err;
        return "system";
    }
    if (parsed && typeof parsed === "object") {
        const record = parsed;
        if (record.version === THEME_STORAGE_VERSION) {
            if (record.theme === "light" || record.theme === "dark" || record.theme === "system") {
                return record.theme;
            }
        }
    }
    return "system";
}
function saveMode(mode) {
    const record = { theme: mode, version: THEME_STORAGE_VERSION };
    writeLocalString(THEME_STORAGE_KEY, JSON.stringify(record));
}
function forgetStoredMode() {
    removeLocalString(THEME_STORAGE_KEY);
}
function resolveMode(mode) {
    if (mode === "system") {
        return systemTheme();
    }
    return mode;
}
function systemTheme() {
    if (typeof window.matchMedia !== "function") {
        return "dark";
    }
    const query = window.matchMedia("(prefers-color-scheme: light)");
    return query.matches ? "light" : "dark";
}
function watchSystemTheme(root) {
    stopSystemWatch();
    if (typeof window.matchMedia !== "function") {
        return;
    }
    const query = window.matchMedia("(prefers-color-scheme: light)");
    systemQuery = query;
    systemListener = function () {
        if (activeMode !== "system") {
            stopSystemWatch();
            return;
        }
        applyTheme(root, systemTheme(), true);
    };
    const listener = systemListener;
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
    }
    else if (typeof query.addListener === "function") {
        query.addListener(listener);
    }
}
function stopSystemWatch() {
    if (systemQuery && systemListener) {
        const query = systemQuery;
        const listener = systemListener;
        if (typeof query.removeEventListener === "function") {
            query.removeEventListener("change", listener);
        }
        else if (typeof query.removeListener === "function") {
            query.removeListener(listener);
        }
    }
    systemQuery = null;
    systemListener = null;
}
function applyTheme(root, theme, announce) {
    const previous = currentTheme(root);
    root.setAttribute("data-theme", theme);
    syncMetaTheme(theme);
    swapThemeAssets(root, theme);
    syncThemeControls(root);
    if (previous !== theme) {
        crossfadeBackground(root, previous, theme);
    }
    if (announce) {
        announceTheme(theme);
    }
}
function syncMetaTheme(theme) {
    const metas = document.querySelectorAll("meta[name='theme-color']");
    metas.forEach(function (node) {
        if (!(node instanceof HTMLMetaElement)) {
            return;
        }
        const media = node.getAttribute("media") || "";
        if (media.length > 0) {
            return;
        }
        node.content = theme === "dark" ? "#0e0817" : "#efeaf8";
    });
}
function syncThemeControls(root) {
    syncPillButtons(activeMode);
    const group = document.querySelector(".menu-theme-pill");
    if (group instanceof HTMLElement) {
        group.setAttribute("data-theme-effective", currentTheme(root));
    }
}
function syncPillButtons(mode) {
    const pills = document.querySelectorAll("[data-theme-choice]");
    pills.forEach(function (node) {
        if (!(node instanceof HTMLButtonElement)) {
            return;
        }
        const choice = node.getAttribute("data-theme-choice") || "";
        node.setAttribute("aria-pressed", choice === mode ? "true" : "false");
    });
}
function wirePill(root) {
    const pills = document.querySelectorAll("[data-theme-choice]");
    let preloaded = false;
    const preloadOnce = function () {
        if (preloaded) {
            return;
        }
        preloaded = true;
        preloadAlternateWebs();
    };
    pills.forEach(function (node) {
        if (!(node instanceof HTMLButtonElement)) {
            return;
        }
        const choice = node.getAttribute("data-theme-choice");
        node.addEventListener("click", function () {
            chooseMode(root, choice);
        });
        node.addEventListener("pointerenter", preloadOnce);
        node.addEventListener("focus", preloadOnce);
    });
}
function chooseMode(root, mode) {
    activeMode = mode;
    if (mode === "system") {
        forgetStoredMode();
        watchSystemTheme(root);
    }
    else {
        saveMode(mode);
        stopSystemWatch();
    }
    applyTheme(root, resolveMode(mode), true);
}
function swapThemeAssets(root, theme) {
    void root;
    swapHeroWebLayers(theme);
}
function swapHeroWebLayers(theme) {
    swapHeroLayer(HERO_FORWARD, "/assets/hero/web-plain-" + theme + ".webp");
    swapHeroLayer(HERO_RETURN, "/assets/hero/web-words-" + theme + ".webp");
}
function swapHeroLayer(layerClass, src) {
    const layers = document.querySelectorAll("." + layerClass);
    layers.forEach(function (node) {
        if (node instanceof HTMLImageElement) {
            if (node.getAttribute("src") !== src) {
                node.setAttribute("src", src);
            }
            return;
        }
        const nested = node.querySelectorAll("img");
        nested.forEach(function (img) {
            if (img instanceof HTMLImageElement && img.getAttribute("src") !== src) {
                img.setAttribute("src", src);
            }
        });
    });
}
function crossfadeBackground(root, previous, next) {
    void root;
    if (prefersReducedMotion()) {
        return;
    }
    const layer = document.querySelector(".site-background");
    if (!(layer instanceof HTMLElement)) {
        return;
    }
    const outgoing = getComputedStyle(layer).getPropertyValue("--bg-image").trim();
    const incoming = outgoing.replace(/bg-(dark|light)\.webp/, "bg-" + next + ".webp");
    if (outgoing.length === 0 || incoming === outgoing || previous === next) {
        return;
    }
    layer.style.setProperty("--bg-old", outgoing);
    layer.style.setProperty("--bg-new", incoming);
    layer.classList.remove("is-crossfading");
    void layer.offsetWidth;
    layer.classList.add("is-crossfading");
    window.setTimeout(function () {
        layer.classList.remove("is-crossfading");
        layer.style.setProperty("--bg-old", incoming);
    }, THEME_CROSSFADE_MS);
}
function wireThemeMessaging(root) {
    window.addEventListener("storage", function (event) {
        if (event.key !== THEME_STORAGE_KEY) {
            return;
        }
        const mode = readMode();
        if (mode === activeMode) {
            return;
        }
        activeMode = mode;
        if (mode === "system") {
            watchSystemTheme(root);
        }
        else {
            stopSystemWatch();
        }
        applyTheme(root, resolveMode(mode), false);
    });
}
function announceTheme(theme) {
    const live = document.querySelector("[data-theme-status]");
    if (live instanceof HTMLElement) {
        live.removeAttribute("hidden");
        live.textContent = theme === "dark" ? "Dark theme on" : "Light theme on";
    }
}
// The art of the other theme is fetched when the visitor shows an interest in
// the theme control, not with the page. Loading it up front doubled the
// transfer of the home page for a picture most visitors never see. Only the
// alternate pair is asked for: the current pair is already on the page.
function preloadAlternateWebs() {
    const other = currentTheme() === "dark" ? "light" : "dark";
    const pairs = [
        "/assets/hero/web-plain-" + other + ".webp",
        "/assets/hero/web-words-" + other + ".webp"
    ];
    const preload = function () {
        for (let i = 0; i < pairs.length; i += 1) {
            const src = pairs[i];
            if (!src) {
                continue;
            }
            const loader = new Image();
            loader.decoding = "async";
            loader.src = src;
        }
    };
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
            window.setTimeout(preload, 0);
        });
    }
    else {
        window.setTimeout(preload, 16);
    }
}

// forms.js
function initForms() {
    const forms = document.querySelectorAll("form.contact-form");
    forms.forEach(function (form) {
        if (form instanceof HTMLFormElement) {
            wireForm(form);
        }
    });
}
function wireForm(form) {
    const startedAt = Math.floor(Date.now() / 1000);
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector("button[type='submit']");
    const endpoint = (form.getAttribute("data-endpoint") || "").trim();
    wireFieldMessages(form);
    // The browser refuses to send a form with an empty field, so the submit
    // event never arrives. The invalid event does, and it does not bubble, so
    // the form listens for it while the event is on its way down.
    form.addEventListener("invalid", function (event) {
        if (!isFormField(event.target)) {
            return;
        }
        announce(status, "Please complete the required fields before sending.");
    }, true);
    form.addEventListener("submit", function (event) {
        const invalid = firstInvalidField(form);
        if (invalid) {
            event.preventDefault();
            announce(status, "Please complete the required fields before sending.");
            invalid.focus();
            return;
        }
        if (endpoint.length === 0) {
            event.preventDefault();
            openMailtoFallback(form, status);
            return;
        }
        event.preventDefault();
        postForm(form, endpoint, status, submit instanceof HTMLButtonElement ? submit : null, startedAt);
    });
}
function isFormField(node) {
    return node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement;
}
function firstInvalidField(form) {
    const fields = form.querySelectorAll("input, select, textarea");
    for (let i = 0; i < fields.length; i = i + 1) {
        const field = fields[i];
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
            if (!field.checkValidity()) {
                return field;
            }
        }
    }
    return null;
}
function wireFieldMessages(form) {
    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach(function (field) {
        if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
            return;
        }
        field.addEventListener("input", function () {
            field.setCustomValidity("");
        });
        field.addEventListener("invalid", function () {
            field.setCustomValidity(messageFor(field));
        });
    });
}
function messageFor(field) {
    if (field.validity.valueMissing) {
        return "This field is required so the spider knows where to weave.";
    }
    if (field.validity.typeMismatch) {
        return "Please enter a valid email address.";
    }
    if (field.validity.patternMismatch) {
        return "Please match the requested format.";
    }
    if (field.validity.tooShort) {
        return "Please add a little more detail.";
    }
    return "Please check this field and try again.";
}
function openMailtoFallback(form, status) {
    const fallback = form.getAttribute("action") || "mailto:annoying.goods@gmail.com";
    if (!fallback.toLowerCase().startsWith("mailto:")) {
        announce(status, "The form endpoint is not configured yet. Please use the mailto fallback.");
        return;
    }
    const data = new FormData(form);
    const subject = String(data.get("summary") || data.get("subject") || "Annoying Goods report");
    const lines = [];
    data.forEach(function (value, key) {
        lines.push(key + ": " + String(value));
    });
    const body = encodeURIComponent(lines.join("\n"));
    const separator = fallback.indexOf("?") >= 0 ? "&" : "?";
    const target = fallback + separator + "subject=" + encodeURIComponent(subject) + "&body=" + body;
    announce(status, "Opening your mail app to send the report.");
    window.location.href = target;
}
function postForm(form, endpoint, status, submit, startedAt) {
    if (submit) {
        submit.disabled = true;
    }
    announce(status, "Sending your message.");
    const data = new FormData(form);
    const payload = {};
    data.forEach(function (value, key) {
        payload[key] = String(value);
    });
    payload["form_started_at"] = String(startedAt);
    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("Request failed with status " + String(response.status));
        }
        announce(status, "Message sent. The spider will read it soon.");
        form.reset();
        if (submit) {
            submit.disabled = false;
        }
    }).catch(function (err) {
        void err;
        announce(status, "Sending failed. Please try again or use the mailto fallback.");
        if (submit) {
            submit.disabled = false;
        }
    });
}
function announce(status, message) {
    if (status) {
        status.textContent = message;
    }
}

// hero-gate.js

const GATE_INTRO_KEY = "ag-hero-intro";
const GATE_INTRO_VERSION = 1;
const PROMPT = "Click to start";
const SPIDER_SRC = "/assets/hero/spider-plain.webp";
function buildGate() {
    const stored = readLocalJson(GATE_INTRO_KEY);
    if (!isReloadNavigation() && stored && stored.version === GATE_INTRO_VERSION && stored.done) {
        return null;
    }
    if (prefersReducedMotion()) {
        writeLocalJson(GATE_INTRO_KEY, { version: GATE_INTRO_VERSION, done: true });
        return null;
    }
    const gate = document.createElement("div");
    gate.className = "hero-gate";
    gate.setAttribute("data-hero-gate", "");
    const spider = document.createElement("img");
    spider.className = "hero-gate-spider";
    spider.src = SPIDER_SRC;
    spider.setAttribute("alt", "");
    spider.setAttribute("aria-hidden", "true");
    const prompt = document.createElement("button");
    prompt.className = "hero-gate-prompt";
    prompt.type = "button";
    prompt.textContent = PROMPT;
    gate.appendChild(spider);
    gate.appendChild(prompt);
    document.body.appendChild(gate);
    // The prompt is the gate's only control; focusing it puts Enter and Space
    // one keystroke away for keyboard visitors without an extra tab stop.
    prompt.focus();
    const dismissed = new Promise(function (resolve) {
        let settled = false;
        function dismiss() {
            if (settled) {
                return;
            }
            settled = true;
            gate.classList.add("is-dismissed");
            writeLocalJson(GATE_INTRO_KEY, { version: GATE_INTRO_VERSION, done: true });
            resolve();
        }
        prompt.addEventListener("click", dismiss);
        gate.addEventListener("click", dismiss, { once: true });
        gate.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                dismiss();
            }
        }, { once: true });
    });
    return { element: gate, dismissed };
}

// hero-geometry.js
const SPRITE_ASPECT = 1050 / 780;
const ABDOMEN = { cx: 0.5095, cy: 0.7249, d: 0.3846 };
const WEB_VERTICES = {
    topRight: { x: 0.97, y: 0.12 },
    topLeft: { x: 0.03, y: 0.12 },
    bottom: { x: 0.50, y: 0.95 }
};

// hero-walk.js
const STEP_MS = 130;
function placeSprite(el, hero, cx, cy, rot) {
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;
    const origin = hero.getBoundingClientRect();
    const localX = cx - origin.left;
    const localY = cy - origin.top;
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.transform = `translate(${localX - w / 2}px, ${localY - h / 2}px) rotate(${rot}deg)`;
}
function headingDeg(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.atan2(dx, -dy) * 180 / Math.PI;
}
function buildPath(topRight, leftX, leftY, topY, legs) {
    const x0 = topRight[0];
    const dx = (x0 - leftX) / legs;
    const pts = [[x0, topRight[1]]];
    let up = true;
    for (let i = 1; i <= legs; i += 1) {
        const t = i / legs;
        const baseY = topRight[1] + (leftY - topRight[1]) * t;
        const y = up ? topY : baseY;
        pts.push([x0 - dx * i, y]);
        up = !up;
    }
    return pts;
}
function walkPath(hero, pts, totalMs, onPosition, onProgress) {
    return new Promise(function (resolve) {
        const start = performance.now();
        const legs = pts.length - 1;
        if (legs < 1) {
            resolve();
            return;
        }
        const perLeg = totalMs / legs;
        hero.style.willChange = "transform";
        function frame(now) {
            const elapsed = Math.max(0, now - start);
            const progress = Math.min(elapsed / totalMs, 1);
            if (onProgress) {
                onProgress(progress);
            }
            if (progress >= 1) {
                const last = pts[legs];
                const prev = pts[legs - 1];
                onPosition(last[0], last[1], headingDeg(prev, last), Math.floor(elapsed / STEP_MS));
                hero.style.willChange = "";
                resolve();
                return;
            }
            const legIndex = Math.max(0, Math.min(Math.floor(elapsed / perLeg), legs - 1));
            const legProgress = (elapsed - legIndex * perLeg) / perLeg;
            const a = pts[legIndex];
            const b = pts[legIndex + 1];
            const x = a[0] + (b[0] - a[0]) * legProgress;
            const y = a[1] + (b[1] - a[1]) * legProgress;
            onPosition(x, y, headingDeg(a, b), Math.floor(elapsed / STEP_MS));
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    });
}
function revealPlain(el, x) {
    if (!(el instanceof HTMLElement)) {
        return;
    }
    el.style.clipPath = `inset(0 0 0 ${Math.round(x)}px)`;
}
function revealWords(el, x, width) {
    if (!(el instanceof HTMLElement)) {
        return;
    }
    const right = Math.max(0, width - x);
    el.style.clipPath = `inset(0 ${Math.round(right)}px 0 0)`;
}

// hero-ball.js


const BALL_SRC = "/assets/hero/ball.webp";
const REST_SIZE = 3;
const BALL_RADIUS = 24;
const BOUNCE_COUNT = 2;
const BOUNCE_MS = 320;
const BOUNCE_LIFT = 48;
const ROLL_OFF_MS = 900;
const FALL_OFF_MS = 700;
const RETURN_PAUSE_MS = 3000;
const REAPPEAR_MS = 420;
const REAPPEAR_LIFT = 190;
const BALL_DROP_MS = 1300;
const BALL_ROLL_MS = 900;
const BALL_STAGE_PAUSE_MS = 420;
const SPIN_ROLL = 360;
const SPIN_BOUNCE = -180;
const SPIN_FALL = 540;
const ROLL_BACK_MS = 900;
const PARK_SETTLE_MS = 260;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSettle = (t) => {
    const smooth = t * t * (3 - 2 * t);
    const curve = 0.35 + 0.65 * t;
    return smooth * curve;
};
let ball = null;
let interactionRunning = false;
let parked = false;
function initHeroBall() {
    if (ball) {
        return;
    }
    const existing = document.querySelector(".logo-ball");
    if (existing instanceof HTMLImageElement) {
        ball = existing;
    }
    else {
        const created = document.createElement("img");
        created.className = "logo-ball";
        created.src = BALL_SRC;
        created.alt = "";
        created.decoding = "async";
        document.body.appendChild(created);
        ball = created;
    }
    ball.setAttribute("role", "button");
    ball.setAttribute("tabindex", "0");
    ball.setAttribute("aria-label", "Annoying Goods logo ball. Activate to play with the spider.");
    ball.setAttribute("aria-describedby", "ball-status-desc");
    ball.addEventListener("click", function () {
        void runBallInteraction();
    });
    ball.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }
        event.preventDefault();
        void runBallInteraction();
    });
    window.addEventListener("scroll", reparkIfParked, { passive: true });
    window.addEventListener("resize", reparkIfParked);
}
// The interaction is a one-shot animation with no persistent state, so a
// polite live region carries the start and the return of the choreography.
let ballStatus = null;
function announceBall(text) {
    if (!ballStatus || !document.body.contains(ballStatus)) {
        ballStatus = document.querySelector("[data-ball-status]");
    }
    if (!ballStatus) {
        ballStatus = document.createElement("span");
        ballStatus.id = "ball-status-desc";
        ballStatus.setAttribute("data-ball-status", "");
        ballStatus.setAttribute("role", "status");
        ballStatus.setAttribute("aria-live", "polite");
        ballStatus.className = "hero-sr-only";
        document.body.appendChild(ballStatus);
    }
    ballStatus.textContent = text;
}
function isBallParked() {
    return parked;
}
function reparkIfParked() {
    if (!ball || !parked || interactionRunning) {
        return;
    }
    const spot = restSpot();
    ball.style.setProperty("--x", String(spot[0]) + "px");
    ball.style.setProperty("--y", String(spot[1]) + "px");
}
async function parkBallInMenu() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target) {
        return;
    }
    await delay(PARK_SETTLE_MS);
    const spot = restSpot();
    target.classList.remove("is-choreo");
    target.classList.add("is-parked");
    target.style.pointerEvents = "";
    target.style.opacity = "1";
    target.style.setProperty("--x", String(spot[0]) + "px");
    target.style.setProperty("--y", String(spot[1]) + "px");
    parked = true;
}
async function runBallChoreo() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target) {
        return;
    }
    target.classList.add("is-choreo");
    target.classList.remove("is-parked");
    target.style.pointerEvents = "none";
    target.style.opacity = "1";
    const start = heroTopRightSpot();
    const title = titleSpot();
    const main = mainSpot();
    const rest = restSpot();
    target.style.setProperty("--x", String(start[0]) + "px");
    target.style.setProperty("--y", String(start[1]) + "px");
    await delay(120);
    const stages = finaleStages(title, main, rest);
    let current = start;
    for (let i = 0; i < stages.length; i += 1) {
        const stage = stages[i];
        if (!stage) {
            continue;
        }
        const rolled = [stage[0], current[1]];
        await playSegment(target, { from: current, to: rolled, duration: BALL_ROLL_MS, ease: easeInOut, spin: SPIN_ROLL });
        await playDrop(target, rolled, stage, BALL_DROP_MS);
        current = stage;
        await delay(BALL_STAGE_PAUSE_MS);
    }
    target.classList.remove("is-choreo");
    target.classList.add("is-parked");
    target.style.pointerEvents = "";
    parked = true;
}
async function runBallInteraction() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target || interactionRunning) {
        return;
    }
    interactionRunning = true;
    try {
        if (prefersReducedMotion()) {
            announceBall("The logo ball stays put because reduced motion is on.");
            await parkBallInMenu();
            return;
        }
        announceBall("The logo ball bounces, rolls off the edge and falls.");
        const spot = restSpot();
        const edge = restEdgeSpot();
        target.classList.add("is-choreo");
        target.classList.remove("is-parked");
        target.style.pointerEvents = "none";
        for (let bounce = 0; bounce < BOUNCE_COUNT; bounce += 1) {
            const lifted = [spot[0], spot[1] - BOUNCE_LIFT];
            await playSegment(target, { from: spot, to: lifted, duration: BOUNCE_MS, ease: easeOut, spin: SPIN_BOUNCE });
            await playSegment(target, { from: lifted, to: spot, duration: BOUNCE_MS, ease: easeIn, spin: 0 });
        }
        const offEdge = [edge[0], spot[1]];
        await playSegment(target, { from: spot, to: offEdge, duration: ROLL_OFF_MS, ease: easeInOut, spin: SPIN_ROLL * 2 });
        const offBottom = [edge[0], window.innerHeight + 120];
        await playSegment(target, { from: offEdge, to: offBottom, duration: FALL_OFF_MS, ease: easeIn, spin: SPIN_FALL });
        target.style.opacity = "0";
        await delay(RETURN_PAUSE_MS);
        const reappear = [edge[0], spot[1] - REAPPEAR_LIFT];
        target.style.opacity = "1";
        target.style.setProperty("--x", String(reappear[0]) + "px");
        target.style.setProperty("--y", String(reappear[1]) + "px");
        await delay(REAPPEAR_MS);
        const land = [edge[0], spot[1]];
        await playDrop(target, reappear, land, BALL_DROP_MS);
        await playSegment(target, { from: land, to: spot, duration: ROLL_BACK_MS, ease: easeInOut, spin: SPIN_ROLL });
        target.classList.remove("is-choreo");
        target.classList.add("is-parked");
        target.style.pointerEvents = "";
        parked = true;
        announceBall("The logo ball is back on the menu.");
    }
    finally {
        interactionRunning = false;
    }
}
async function playDrop(target, from, to, duration) {
    await playSegment(target, { from: from, to: to, duration: duration * 0.78, ease: easeIn, spin: SPIN_FALL });
    const lifted = [to[0], to[1] - BOUNCE_LIFT * 0.45];
    await playSegment(target, { from: to, to: lifted, duration: duration * 0.14, ease: easeOut, spin: SPIN_BOUNCE });
    await playSegment(target, { from: lifted, to: to, duration: duration * 0.08, ease: easeIn, spin: 0 });
}
async function playSegment(target, segment) {
    const start = performance.now();
    return new Promise(function (resolve) {
        function frame(now) {
            const t = Math.min(Math.max(0, now - start) / segment.duration, 1);
            const eased = segment.ease(t);
            const spin = segment.spin * eased;
            const x = segment.from[0] + (segment.to[0] - segment.from[0]) * eased;
            const y = segment.from[1] + (segment.to[1] - segment.from[1]) * eased;
            target.style.setProperty("--x", String(x) + "px");
            target.style.setProperty("--y", String(y) + "px");
            target.style.setProperty("--ball-spin", String(spin) + "deg");
            if (t >= 1) {
                resolve();
                return;
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    });
}
function restSurface() {
    const selector = isMobileLayout() ? ".title-box" : ".menu-box";
    const surface = document.querySelector(selector);
    if (surface instanceof HTMLElement) {
        const rect = surface.getBoundingClientRect();
        if (rect.width > 0) {
            return surface;
        }
    }
    return null;
}
function ballRadius() {
    if (ball) {
        const size = ball.offsetWidth || 0;
        if (size > 0) {
            return size / 2;
        }
    }
    return BALL_RADIUS;
}
function restSpot() {
    const surface = restSurface();
    if (surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.min(Math.max(rect.left + rect.width / 2, 24), window.innerWidth - 24);
        const y = rect.top - ballRadius();
        return [x, y];
    }
    return [window.innerWidth / 2, window.innerHeight - 60];
}
function restEdgeSpot() {
    const surface = restSurface();
    if (surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.max(rect.left + ballRadius(), 16);
        return [x, rect.top - ballRadius()];
    }
    return [24, window.innerHeight - 60];
}
function titleSpot() {
    const title = document.querySelector(".title-box");
    if (title instanceof HTMLElement) {
        const rect = title.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width / 2, rect.top - ballRadius()];
        }
    }
    return [window.innerWidth / 2, 80];
}
function mainSpot() {
    const main = document.querySelector(".main-box");
    if (main instanceof HTMLElement) {
        const rect = main.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width / 2, rect.top - ballRadius()];
        }
    }
    return [window.innerWidth / 2, 160];
}
// On a phone the main box starts right under the title box, so a landing on
// the main box drops the ball onto the page title instead of onto a panel.
// Every landing there stays on top of the title box, and the middle one
// moves along its edge so the ball still travels.
function finaleStages(title, main, rest) {
    if (!isMobileLayout()) {
        return [title, main, rest];
    }
    return [title, titleSideSpot(title), rest];
}
function titleSideSpot(title) {
    const box = document.querySelector(".title-box");
    if (box instanceof HTMLElement) {
        const rect = box.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + ballRadius() + 6, title[1]];
        }
    }
    return title;
}
function heroTopRightSpot() {
    const hero = document.querySelector("[data-hero-strip]");
    if (hero instanceof HTMLElement) {
        const rect = hero.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width * 0.9, rect.top + rect.height * 0.14];
        }
    }
    return [window.innerWidth * 0.9, 80];
}
function delay(ms) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
    });
}

// hero-spider.js





const SPIDER_INTRO_KEY = "ag-hero-intro";
const SPIDER_INTRO_VERSION = 1;
const BLINK_PERIOD_MS = 1700;
const BLINK_FRAME_MS = 1700;
const BLINK_CYCLES = 2;
const LOGO_MS = 1400;
const TO_CORNER_MS = 2400;
const WEAVE_MS = 5600;
const RETURN_MS = 5600;
const MORPH_MS = 1600;
const VANISH_MS = 1200;
const WEAVE_LEGS = 9;
const WALK_BOB = 7;
const ASSET_ROOT = "/assets/hero/";
let currentState = "idle";
let pendingSleeps = [];
function getHeroState() {
    return currentState;
}
function setHeroState(state) {
    currentState = state;
    const hero = document.querySelector("[data-hero-anim]");
    if (hero instanceof HTMLElement) {
        hero.setAttribute("data-hero-state", state);
    }
    window.__heroState = state;
}
function sleep(ms) {
    return new Promise(function (resolve) {
        let settled = false;
        const finish = function () {
            if (settled) {
                return;
            }
            settled = true;
            resolve();
        };
        pendingSleeps.push(finish);
        window.setTimeout(finish, ms);
    });
}
function flushSleeps() {
    const list = pendingSleeps.splice(0, pendingSleeps.length);
    for (let i = 0; i < list.length; i += 1) {
        const finish = list[i];
        if (finish) {
            finish();
        }
    }
}
function show(el, visible) {
    if (!el) {
        return;
    }
    el.style.opacity = visible ? "1" : "0";
}
function clearInHeroBall(hero) {
    const b = hero.querySelector(".hero-ball");
    if (b instanceof HTMLElement) {
        b.style.opacity = "0";
    }
}
function isHome(hero) {
    return hero.hasAttribute("data-hero-anim-full");
}
function initHeroSpider() {
    const hero = document.querySelector("[data-hero-anim]");
    if (!(hero instanceof HTMLElement)) {
        return;
    }
    ensureLayers(hero);
    initHeroBall();
    document.addEventListener("visibilitychange", function () {
        // A hidden tab must not keep the 21s weave waiting on timers; the sleep
        // chain collapses so the sequence is settled when the visitor returns.
        if (document.hidden && currentState !== "idle" && currentState !== "done") {
            flushSleeps();
        }
    });
    void runHome(hero);
}
async function runHome(hero) {
    if (!isHome(hero)) {
        hideStartPrompt(hero);
        showRestingBall(hero);
        await parkBallInMenu();
        return;
    }
    const stored = readLocalJson(SPIDER_INTRO_KEY);
    const replay = isReloadNavigation();
    if (!replay && stored && stored.version === SPIDER_INTRO_VERSION && stored.done) {
        hideStartPrompt(hero);
        showRestingBall(hero);
        await parkBallInMenu();
        return;
    }
    if (prefersReducedMotion()) {
        jumpToDone(hero);
        await parkBallInMenu();
        writeLocalJson(SPIDER_INTRO_KEY, { version: SPIDER_INTRO_VERSION, done: true });
        return;
    }
    const gate = buildGate();
    if (!gate) {
        showRestingBall(hero);
        return;
    }
    wireStartButton(gate);
    hideStartPrompt(hero);
    await gate.dismissed;
    await runSequence(hero);
    writeLocalJson(SPIDER_INTRO_KEY, { version: SPIDER_INTRO_VERSION, done: true });
}
function hideStartPrompt(hero) {
    const prompt = hero.querySelector(".hero-prompt");
    if (prompt instanceof HTMLElement) {
        prompt.hidden = true;
    }
    const start = hero.querySelector("[data-hero-start]");
    if (start instanceof HTMLElement) {
        start.hidden = true;
    }
}
function wireStartButton(gate) {
    const start = document.querySelector("[data-hero-start]");
    if (!(start instanceof HTMLElement)) {
        return;
    }
    start.addEventListener("click", function () {
        gate.element.click();
    });
}
async function runSequence(hero) {
    // The logo beat swaps the sprite mid-run; fetching it now, while the blink
    // cycles run, keeps the swap from stalling on a cold decode.
    preloadSources([ASSET_ROOT + "spider-blink-logo.webp"]);
    await materializeSprites(hero);
    const plain = hero.querySelector(".hero-sprite-plain");
    const walkImg = hero.querySelector(".hero-sprite-walk");
    const blinkImg = hero.querySelector(".hero-sprite-blink");
    const vanishImg = hero.querySelector(".hero-sprite-disappear");
    const webPlain = hero.querySelector("[data-ha-web='plain']");
    const webWords = hero.querySelector("[data-ha-web='words']");
    const boxes = [
        document.querySelector(".title-box"),
        document.querySelector(".main-box"),
        document.querySelector(".menu-box"),
    ];
    for (let i = 0; i < boxes.length; i += 1) {
        const box = boxes[i];
        if (box instanceof HTMLElement) {
            box.classList.add("is-hidden");
        }
    }
    const heroRect = hero.getBoundingClientRect();
    const webRect = (webPlain ?? hero).getBoundingClientRect();
    const webW = webRect.width;
    const webH = webRect.height;
    const topRight = [
        webRect.left + WEB_VERTICES.topRight.x * webW,
        webRect.top + WEB_VERTICES.topRight.y * webH,
    ];
    const leftEdgeX = webRect.left + WEB_VERTICES.topLeft.x * webW;
    const leftSurfaceY = webRect.top + webH * 0.72;
    setHeroState("idle");
    show(plain, true);
    show(walkImg, false);
    show(blinkImg, false);
    show(vanishImg, false);
    placeSprite(plain, hero, heroRect.left + heroRect.width / 2, heroRect.top + heroRect.height / 2, 0);
    await runBlink(hero, plain, blinkImg);
    await runLogoBeat(hero, plain);
    setHeroState("to-corner");
    show(walkImg, true);
    show(plain, false);
    const start = [heroRect.left + heroRect.width / 2, heroRect.top + heroRect.height / 2];
    await walkPath(hero, [start, topRight], TO_CORNER_MS, (x, y, rot, step) => {
        const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
        placeSprite(walkImg, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
    });
    setHeroState("weave");
    const webTopY = webRect.top + webH * 0.05;
    const path = buildPath(topRight, leftEdgeX, leftSurfaceY, webTopY, WEAVE_LEGS);
    const weaveStartX = path[0] ? path[0][0] : topRight[0];
    if (webPlain) {
        webPlain.style.opacity = "1";
        // The clip starts where the spider starts, so the web is revealed by the
        // walk alone. A clip of zero would show the whole web for one frame.
        revealPlain(webPlain, weaveStartX - webRect.left);
    }
    await walkPath(hero, path, WEAVE_MS, (x, y, rot, step) => {
        const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
        placeSprite(walkImg, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
        if (webPlain) {
            revealPlain(webPlain, x - webRect.left);
        }
    });
    if (webPlain) {
        revealPlain(webPlain, 0);
    }
    revealBoxes(boxes);
    setHeroState("return");
    if (webWords) {
        webWords.style.opacity = "1";
    }
    await walkPath(hero, path.slice().reverse(), RETURN_MS, (x, y, rot, step) => {
        const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
        placeSprite(walkImg, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
        if (webWords) {
            revealWords(webWords, x - webRect.left, webW);
        }
    });
    if (webWords) {
        revealWords(webWords, webW, webW);
    }
    setHeroState("vanish");
    show(walkImg, false);
    if (vanishImg) {
        placeSprite(vanishImg, hero, topRight[0], topRight[1], 0);
        show(vanishImg, true);
    }
    await sleep(VANISH_MS);
    show(vanishImg, false);
    setHeroState("morph");
    if (plain) {
        placeSprite(plain, hero, topRight[0], topRight[1], 0);
        plain.style.transition = "opacity " + String(MORPH_MS) + "ms ease";
        plain.style.opacity = "0";
    }
    await sleep(MORPH_MS);
    setHeroState("settle");
    await runBallChoreo();
    setHeroState("done");
    show(plain, false);
    updateDesc("Intro complete: the web is fully woven, the boxes are open, and the logo ball is parked in the menu.");
    clearInHeroBall(hero);
    showRestingBall(hero);
    if (plain) {
        plain.style.transition = "";
        plain.src = ASSET_ROOT + "spider-plain.webp";
    }
}
async function runBlink(hero, plain, blinkImg) {
    setHeroState("blink");
    for (let cycle = 0; cycle < BLINK_CYCLES; cycle += 1) {
        const wait = cycle === 0 ? 0 : BLINK_PERIOD_MS - BLINK_FRAME_MS;
        await sleep(wait);
        show(plain, false);
        show(blinkImg, true);
        if (blinkImg) {
            placeSprite(blinkImg, hero, hero.getBoundingClientRect().left + hero.getBoundingClientRect().width / 2, hero.getBoundingClientRect().top + hero.getBoundingClientRect().height / 2, 0);
        }
        await sleep(BLINK_FRAME_MS);
        show(blinkImg, false);
        show(plain, true);
    }
}
async function runLogoBeat(hero, plain) {
    if (!plain) {
        return;
    }
    const previous = plain.getAttribute("src") || "";
    const rect = hero.getBoundingClientRect();
    plain.src = ASSET_ROOT + "spider-blink-logo.webp";
    placeSprite(plain, hero, rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
    show(plain, true);
    await sleep(LOGO_MS);
    plain.src = previous;
    placeSprite(plain, hero, rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
}
function revealBoxes(boxes) {
    for (let i = 0; i < boxes.length; i += 1) {
        const box = boxes[i];
        if (box instanceof HTMLElement) {
            box.classList.remove("is-hidden");
            box.classList.add("is-entering");
        }
    }
}
function updateDesc(text) {
    let desc = document.querySelector("[data-ha-desc]");
    if (!(desc instanceof HTMLElement)) {
        desc = document.createElement("div");
        desc.setAttribute("data-ha-desc", "");
        desc.setAttribute("aria-live", "polite");
        desc.className = "hero-sr-only";
        document.body.appendChild(desc);
    }
    desc.textContent = text;
}
function webs() {
    const theme = readThemeChoice();
    return [
        ASSET_ROOT + "web-plain-" + theme + ".webp",
        ASSET_ROOT + "web-words-" + theme + ".webp"
    ];
}
function readThemeChoice() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "light" ? "light" : "dark";
}
function preloadSources(sources) {
    for (let i = 0; i < sources.length; i += 1) {
        const src = sources[i];
        if (!src) {
            continue;
        }
        const loader = new Image();
        loader.decoding = "async";
        loader.src = src;
    }
}
function ensureLayers(hero) {
    const stage = hero.querySelector(".hero-stage");
    if (!(stage instanceof HTMLElement)) {
        return;
    }
    const theme = readThemeChoice();
    ensureLayer(hero, stage, "hero-web-layer hero-web-layer-forward", ASSET_ROOT + "web-plain-" + theme + ".webp");
    ensureLayer(hero, stage, "hero-web-layer hero-web-layer-return", ASSET_ROOT + "web-words-" + theme + ".webp");
    ensureLayer(hero, stage, "hero-sprite hero-sprite-plain", ASSET_ROOT + "spider-plain.webp", true);
    ensureLayer(hero, stage, "hero-sprite hero-sprite-walk", ASSET_ROOT + "spider-walk.webp", true);
    ensureLayer(hero, stage, "hero-sprite hero-sprite-blink", ASSET_ROOT + "spider-blink-eye.webp", true);
    ensureLayer(hero, stage, "hero-sprite hero-sprite-disappear", ASSET_ROOT + "spider-disappear.webp", true);
    ensureLayer(hero, stage, "hero-sprite hero-ball", ASSET_ROOT + "ball.webp");
    const forward = hero.querySelector(".hero-web-layer-forward");
    const ret = hero.querySelector(".hero-web-layer-return");
    if (forward instanceof HTMLElement) {
        forward.classList.add("ha-web");
        forward.setAttribute("data-ha-web", "plain");
    }
    if (ret instanceof HTMLElement) {
        ret.classList.add("ha-web");
        ret.setAttribute("data-ha-web", "words");
    }
    preloadSources(webs());
    watchThemeSwaps(hero);
}
// The sprite plates weigh more than a megabyte together, and the sequence
// only starts when the visitor asks for it, so the plates are fetched when
// the weaving begins instead of with the page.
async function materializeSprites(hero) {
    const layers = hero.querySelectorAll(".hero-sprite");
    const pending = [];
    layers.forEach(function (layer) {
        if (!(layer instanceof HTMLImageElement)) {
            return;
        }
        const deferred = layer.getAttribute("data-src");
        if (!deferred) {
            return;
        }
        layer.setAttribute("src", deferred);
        layer.removeAttribute("data-src");
        pending.push(waitForImage(layer));
    });
    await Promise.all(pending);
}
function waitForImage(image) {
    return new Promise(function (resolve) {
        if (image.complete) {
            resolve();
            return;
        }
        image.addEventListener("load", function () { resolve(); }, { once: true });
        image.addEventListener("error", function () { resolve(); }, { once: true });
    });
}
function ensureLayer(hero, stage, className, src, deferred) {
    const first = className.split(" ")[1] || className;
    const found = hero.querySelector("." + first);
    if (found instanceof HTMLImageElement) {
        if (deferred === true) {
            if (found.getAttribute("data-src") !== src) {
                found.setAttribute("data-src", src);
            }
            return;
        }
        if (found.getAttribute("src") !== src) {
            found.setAttribute("src", src);
        }
        return;
    }
    if (found) {
        return;
    }
    const layer = document.createElement("img");
    layer.className = className;
    if (deferred === true) {
        layer.setAttribute("data-src", src);
    }
    else {
        layer.src = src;
    }
    layer.alt = "";
    layer.setAttribute("aria-hidden", "true");
    layer.decoding = "async";
    hero.insertBefore(layer, stage);
}
function watchThemeSwaps(hero) {
    if (hero.getAttribute("data-theme-wired") === "true") {
        return;
    }
    hero.setAttribute("data-theme-wired", "true");
    const observer = new MutationObserver(function () {
        if (!document.body.contains(hero)) {
            observer.disconnect();
            return;
        }
        const theme = readThemeChoice();
        swapWebLayer(hero, "hero-web-layer-forward", ASSET_ROOT + "web-plain-" + theme + ".webp");
        swapWebLayer(hero, "hero-web-layer-return", ASSET_ROOT + "web-words-" + theme + ".webp");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
function swapWebLayer(hero, layerClass, src) {
    const layer = hero.querySelector("." + layerClass);
    if (layer instanceof HTMLImageElement && layer.getAttribute("src") !== src) {
        layer.setAttribute("src", src);
    }
}
function showRestingBall(hero) {
    hero.classList.remove("is-gated");
    hero.classList.add("is-resting");
    revealWebLayers(hero);
    if (!isHome(hero)) {
        startIdleRoll(hero);
    }
}
function revealWebLayers(hero) {
    // An earlier run of the sequence could have left the webs turned; the
    // resting hero always shows them upright and fully woven.
    const layers = hero.querySelectorAll(".ha-web");
    layers.forEach(function (node) {
        if (node instanceof HTMLElement) {
            node.style.transform = "";
        }
    });
    const webPlain = hero.querySelector("[data-ha-web='plain']");
    if (webPlain) {
        webPlain.style.opacity = "1";
        webPlain.style.clipPath = "inset(0 0 0 0)";
    }
    const webWords = hero.querySelector("[data-ha-web='words']");
    if (webWords) {
        webWords.style.opacity = "1";
        webWords.style.clipPath = "inset(0 0 0 0)";
    }
}
function startIdleRoll(hero) {
    hero.classList.remove("is-idle-rolling");
    window.setTimeout(function () {
        if (!document.body.contains(hero)) {
            return;
        }
        if (prefersReducedMotion()) {
            return;
        }
        if (!hero.classList.contains("is-resting")) {
            return;
        }
        hero.classList.add("is-idle-rolling");
        window.setTimeout(function () {
            hero.classList.remove("is-idle-rolling");
        }, 3200);
    }, 1200);
}
function jumpToDone(hero) {
    flushSleeps();
    hero.classList.remove("is-gated");
    hero.removeAttribute("data-hero-cue");
    hero.classList.add("is-resting");
    revealWebLayers(hero);
    const plain = hero.querySelector(".hero-sprite-plain");
    if (plain) {
        plain.style.transition = "";
        plain.style.opacity = "0";
    }
    const blink = hero.querySelector(".hero-sprite-blink");
    if (blink) {
        blink.style.opacity = "0";
    }
    const vanish = hero.querySelector(".hero-sprite-disappear");
    if (vanish) {
        vanish.style.opacity = "0";
    }
    const webPlain = hero.querySelector("[data-ha-web='plain']");
    if (webPlain) {
        webPlain.style.opacity = "1";
        webPlain.style.clipPath = "inset(0 0 0 0)";
    }
    const webWords = hero.querySelector("[data-ha-web='words']");
    if (webWords) {
        webWords.style.opacity = "1";
        webWords.style.clipPath = "inset(0 0 0 0)";
    }
    const boxes = [
        document.querySelector(".title-box"),
        document.querySelector(".main-box"),
        document.querySelector(".menu-box"),
    ];
    for (let i = 0; i < boxes.length; i += 1) {
        const box = boxes[i];
        if (box instanceof HTMLElement) {
            box.classList.remove("is-hidden");
            box.classList.remove("is-entering");
        }
    }
    const prompt = hero.querySelector(".hero-prompt");
    if (prompt instanceof HTMLElement) {
        prompt.hidden = true;
    }
    const start = hero.querySelector("[data-hero-start]");
    if (start instanceof HTMLElement) {
        start.hidden = true;
    }
    setHeroState("done");
}

// err404.js

const BOOM_MS = 4560;
const HOLD_AT = 3900;
const FADE_MS = 660;
const BUSY_WINDOW_MS = BOOM_MS + 640;
function initErr404() {
    const stage = document.querySelector("[data-err-state]");
    if (!(stage instanceof HTMLElement)) {
        return;
    }
    ensureSplash(stage);
    const image = stage.querySelector(".err-spider");
    const poke = document.querySelector("[data-spider-poke]");
    if (!(poke instanceof HTMLButtonElement)) {
        return;
    }
    let busy = false;
    let interacted = false;
    poke.setAttribute("aria-pressed", "false");
    poke.addEventListener("click", function () {
        if (busy) {
            return;
        }
        busy = true;
        poke.setAttribute("aria-pressed", "true");
        window.setTimeout(releaseBusy, BUSY_WINDOW_MS);
        if (prefersReducedMotion()) {
            splashReduced(stage, poke, releaseBusy);
            swapCopy();
            return;
        }
        const state = readState(stage);
        if (state === "spider") {
            playBoom(stage, image instanceof HTMLImageElement ? image : null, poke, releaseBusy);
        }
        else {
            restoreSpider(stage, image instanceof HTMLImageElement ? image : null, releaseBusy);
        }
        if (!interacted) {
            interacted = true;
            swapCopy();
        }
        function releaseBusy() {
            busy = false;
        }
    });
}
function readState(stage) {
    const raw = stage.getAttribute("data-err-state") || "spider";
    if (raw === "boom" || raw === "fade" || raw === "empty") {
        return raw;
    }
    return "spider";
}
function ensureSplash(stage) {
    const found = stage.querySelector(".err-splash");
    if (found instanceof HTMLElement) {
        return;
    }
    const art = stage.querySelector(".spider-art");
    const message = stage.querySelector(".spider-message");
    const poke = stage.querySelector("[data-spider-poke]");
    if (art instanceof HTMLElement) {
        const top = document.createElement("p");
        top.className = "err-splash err-splash-top";
        top.textContent = "SPLASH!";
        top.hidden = true;
        top.setAttribute("aria-hidden", "true");
        art.appendChild(top);
        const below = document.createElement("p");
        below.className = "err-splash err-splash-art";
        below.textContent = "SPLASH!";
        below.hidden = true;
        below.setAttribute("aria-hidden", "true");
        art.appendChild(below);
    }
    if (message instanceof HTMLElement) {
        const corner = document.createElement("p");
        corner.className = "err-splash err-splash-corner";
        corner.textContent = "SPLASH!";
        corner.hidden = true;
        corner.setAttribute("aria-hidden", "true");
        message.appendChild(corner);
        if (poke instanceof HTMLElement && poke.parentElement) {
            const beside = document.createElement("span");
            beside.className = "err-splash err-splash-button";
            beside.textContent = "SPLASH!";
            beside.hidden = true;
            beside.setAttribute("aria-hidden", "true");
            poke.parentElement.insertBefore(beside, poke.nextSibling);
        }
    }
}
function setSplashVisible(stage, visible) {
    stage.querySelectorAll(".err-splash").forEach(function (node) {
        if (node instanceof HTMLElement) {
            node.hidden = !visible;
        }
    });
}
function playBoom(stage, image, poke, done) {
    stage.setAttribute("data-err-state", "boom");
    stage.classList.add("is-boom");
    setSplashVisible(stage, true);
    let boomAnimationFinished = false;
    if (image) {
        image.src = "/assets/404-boom.webp";
        image.addEventListener("animationend", function () {
            boomAnimationFinished = true;
        }, { once: true });
    }
    poke.disabled = true;
    window.setTimeout(function () {
        const showEnd = function () {
            if (image) {
                image.src = "/assets/404-boom-end.webp";
            }
            setSplashVisible(stage, false);
            stage.setAttribute("data-err-state", "fade");
            if (image) {
                image.style.transition = "opacity " + String(FADE_MS) + "ms ease";
                image.style.opacity = "0";
            }
            window.setTimeout(function () {
                stage.setAttribute("data-err-state", "empty");
                stage.classList.remove("is-boom");
                poke.disabled = false;
                poke.textContent = "Bring the spider back";
                done();
            }, FADE_MS);
        };
        if (boomAnimationFinished || !image) {
            showEnd();
            return;
        }
        image.addEventListener("animationend", showEnd, { once: true });
    }, HOLD_AT);
}
function restoreSpider(stage, image, done) {
    stage.setAttribute("data-err-state", "spider");
    stage.classList.remove("is-boom");
    setSplashVisible(stage, false);
    const poke = document.querySelector("[data-spider-poke]");
    if (image) {
        image.src = "/assets/spider-404.webp";
        image.style.transition = "opacity " + String(FADE_MS) + "ms ease";
        image.style.opacity = "0";
        window.requestAnimationFrame(function () {
            image.style.opacity = "1";
        });
    }
    if (poke instanceof HTMLButtonElement) {
        poke.textContent = "Poke the spider";
    }
    window.setTimeout(done, FADE_MS);
}
function splashReduced(stage, poke, done) {
    setSplashVisible(stage, true);
    stage.setAttribute("data-err-state", "empty");
    poke.disabled = true;
    window.setTimeout(function () {
        setSplashVisible(stage, false);
        poke.disabled = false;
        poke.textContent = "Bring the spider back";
        done();
    }, 3000);
}
function swapCopy() {
    const initial = document.querySelector("[data-error-initial]");
    const alternate = document.querySelector("[data-error-alternate]");
    if (initial instanceof HTMLElement && alternate instanceof HTMLElement) {
        initial.hidden = true;
        alternate.hidden = false;
        const heading = document.querySelector("#error-heading");
        if (heading) {
            heading.textContent = "Error 404: Ain't nuffin' here you monster!";
        }
    }
}

// entry-reader.js
const ENTRY_SELECTOR = "[data-entry-body]";
let reader = null;
let openId = "";
let trigger = null;
function initEntryReader() {
    const main = document.querySelector("[data-main-box]");
    if (!(main instanceof HTMLElement)) {
        return;
    }
    if (!document.querySelector(ENTRY_SELECTOR)) {
        return;
    }
    window.addEventListener("hashchange", function () {
        render(main);
    });
    render(main);
}
function entryId() {
    const hash = window.location.hash || "";
    if (hash.length < 2) {
        return "";
    }
    return hash.slice(1);
}
function render(main) {
    const id = entryId();
    const source = id ? document.querySelector('[data-entry-body="' + id + '"]') : null;
    if (!source) {
        close(main);
        return;
    }
    if (openId === id && reader) {
        return;
    }
    const opener = findTrigger(id);
    close(main);
    openId = id;
    const title = entryTitle(source);
    reader = document.createElement("article");
    reader.className = "entry-reader";
    reader.setAttribute("data-admin", "content:content.css");
    reader.setAttribute("tabindex", "-1");
    const heading = document.createElement("h2");
    heading.className = "section-heading";
    heading.setAttribute("tabindex", "-1");
    heading.textContent = title;
    const body = document.createElement("div");
    body.className = "entry-reader-body";
    body.innerHTML = source.innerHTML;
    smoothExcerptMark(body);
    const back = document.createElement("button");
    back.className = "entry-back";
    back.type = "button";
    back.textContent = "Back to the list";
    back.addEventListener("click", function () {
        closeAndClearHash(main);
    });
    reader.appendChild(heading);
    reader.appendChild(body);
    reader.appendChild(back);
    main.appendChild(reader);
    main.classList.add("is-reading");
    main.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "auto" });
    trigger = opener;
    focusReader();
    announceEntryOpen(title);
}
function findTrigger(id) {
    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
        if (!(link instanceof HTMLElement)) {
            continue;
        }
        if (link.getAttribute("href") === "#" + id) {
            return link;
        }
    }
    return null;
}
function focusReader() {
    if (!reader) {
        return;
    }
    const heading = reader.querySelector(".section-heading");
    if (heading instanceof HTMLElement) {
        heading.focus();
        return;
    }
    reader.focus();
}
function announceEntryOpen(title) {
    const status = document.querySelector("[data-entry-status]");
    if (!status) {
        return;
    }
    status.textContent = "";
    window.requestAnimationFrame(function () {
        status.textContent = "Opened " + title + " in full.";
    });
}
function closeAndClearHash(main) {
    clearHash();
    close(main);
}
function clearHash() {
    if (!window.location.hash) {
        return;
    }
    const url = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", url);
}
function close(main) {
    if (reader) {
        reader.remove();
        reader = null;
    }
    main.classList.remove("is-reading");
    openId = "";
    restoreFocus();
}
function restoreFocus() {
    if (!trigger) {
        return;
    }
    const target = trigger;
    trigger = null;
    if (target.isConnected) {
        target.focus();
    }
}
function entryTitle(source) {
    const card = source.closest("article");
    const heading = card ? card.querySelector(".article-heading") : null;
    if (heading) {
        const text = heading.textContent || "";
        if (text.trim().length > 0) {
            return text.trim();
        }
    }
    return "Entry";
}
// The card excerpt ends with three dots. Inside the full text it reads as a
// stray mark, so the first one is dropped.
function smoothExcerptMark(body) {
    const first = body.querySelector("p");
    if (!first) {
        return;
    }
    const text = first.textContent || "";
    const cut = text.indexOf("...");
    if (cut === -1) {
        return;
    }
    const cleaned = text.slice(0, cut) + text.slice(cut + 3);
    first.textContent = cleaned;
}

// main.js


















function initDemoChartLazy() {
    if (!document.querySelector("[data-demo-chart]")) {
        return;
    }
    void import("./demo-chart.js").then(function (mod) {
        mod.initDemoChart();
    }).catch(function (err) {
        console.error("Annoying Goods chart module failed to load", err);
    });
}
const MODULES = [
    { name: "menu-data", init: initMenuData },
    { name: "menu-tree", init: initMenuTree },
    { name: "page-state", init: initPageState },
    { name: "menu-search", init: initMenuSearch },
    { name: "menu-dim", init: initMenuDim },
    { name: "menu-bubble", init: initMenuBubble },
    { name: "playground-menu", init: initPlaygroundMenu },
    { name: "transitions", init: initTransitions },
    { name: "lens", init: initLens },
    { name: "glow", init: initGlow },
    { name: "lightbox", init: initLightbox },
    { name: "carousel", init: initCarousel },
    { name: "cookies", init: initCookies },
    { name: "theme", init: initTheme },
    { name: "forms", init: initForms },
    { name: "hero-spider", init: initHeroSpider },
    { name: "err404", init: initErr404 },
    { name: "demo-chart", init: initDemoChartLazy },
    { name: "entry-reader", init: initEntryReader },
];
function boot() {
    for (let i = 0; i < MODULES.length; i = i + 1) {
        const module = MODULES[i];
        if (!module) {
            continue;
        }
        try {
            module.init();
        }
        catch (err) {
            console.error("Annoying Goods module failed: " + module.name, err);
        }
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
}
else {
    boot();
}
