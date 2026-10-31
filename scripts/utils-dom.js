export function queryOne(root, selector) {
    const found = root.querySelector(selector);
    return found;
}
export function queryAll(root, selector) {
    const list = root.querySelectorAll(selector);
    const out = [];
    list.forEach(function (el) {
        out.push(el);
    });
    return out;
}
export function normalizePath(raw) {
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
export function getCanonicalPath() {
    const body = document.body;
    if (body) {
        const attr = body.getAttribute("data-page");
        if (attr && attr.trim().length > 0) {
            return normalizePath(attr);
        }
    }
    return normalizePath(window.location.pathname);
}
export function isSameSiteUrl(href) {
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
export function prefersReducedMotion() {
    if (typeof window.matchMedia !== "function") {
        return false;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    return query.matches;
}
export function hasFinePointer() {
    if (typeof window.matchMedia !== "function") {
        return false;
    }
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    return fine.matches && hover.matches;
}
const memorySession = new Map();
export function readSessionString(key) {
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
export function isReloadNavigation() {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
        return false;
    }
    const entries = performance.getEntriesByType("navigation");
    const entry = entries[0];
    return !!entry && entry.type === "reload";
}
export function readSessionJson(key) {
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
export function writeSessionJson(key, value) {
    try {
        writeSessionString(key, JSON.stringify(value));
    }
    catch (err) {
        void err;
    }
}
export function writeSessionString(key, value) {
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
export function readLocalString(key) {
    try {
        return window.localStorage.getItem(key);
    }
    catch (err) {
        warnStorageOnce(key, err);
        return memoryStorage.get(key) || null;
    }
}
export function writeLocalString(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return;
    }
    catch (err) {
        warnStorageOnce(key, err);
        memoryStorage.set(key, value);
    }
}
export function readLocalJson(key) {
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
export function writeLocalJson(key, value) {
    try {
        writeLocalString(key, JSON.stringify(value));
    }
    catch (err) {
        void err;
    }
}
export function debounce(fn, delay) {
    let timer = 0;
    return function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(fn, delay);
    };
}
export function onNextFrame(fn) {
    if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
            fn();
        });
    }
    else {
        window.setTimeout(fn, 16);
    }
}
export function isEditableTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }
    const editable = target.closest("input, textarea, select, [contenteditable]");
    return editable !== null;
}
export function isMenuChrome(target) {
    if (!(target instanceof Element)) {
        return false;
    }
    const chrome = target.closest("[data-menu], [data-menu-bubble]");
    return chrome !== null;
}
//# sourceMappingURL=utils-dom.js.map