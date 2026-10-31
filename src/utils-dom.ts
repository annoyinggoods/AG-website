export function queryOne(root: ParentNode, selector: string): Element | null {
  const found = root.querySelector(selector);
  return found;
}
export function queryAll(root: ParentNode, selector: string): Element[] {
  const list = root.querySelectorAll(selector);
  const out: Element[] = [];
  list.forEach(function (el: Element): void {
    out.push(el);
  });
  return out;
}
export function normalizePath(raw: string): string {
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
    } else {
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
export function getCanonicalPath(): string {
  const body = document.body;
  if (body) {
    const attr = body.getAttribute("data-page");
    if (attr && attr.trim().length > 0) {
      return normalizePath(attr);
    }
  }
  return normalizePath(window.location.pathname);
}
export function isSameSiteUrl(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch (err) {
    void err;
    return false;
  }
  return url.origin === window.location.origin;
}
export function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  return query.matches;
}
export function hasFinePointer(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  const fine = window.matchMedia("(pointer: fine)");
  const hover = window.matchMedia("(hover: hover)");
  return fine.matches && hover.matches;
}
const memorySession = new Map<string, string>();

export function readSessionString(key: string): string | null {
  try {
    const value = window.sessionStorage.getItem(key);
    if (value !== null) {
      return value;
    }
    return memorySession.get(key) || null;
  } catch (err) {
    void err;
    return memorySession.get(key) || null;
  }
}
export function isReloadNavigation(): boolean {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return false;
  }
  const entries = performance.getEntriesByType("navigation");
  const entry = entries[0] as { type?: string } | undefined;
  return !!entry && entry.type === "reload";
}
export function readSessionJson<T>(key: string): T | null {
  const raw = readSessionString(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    void err;
    return null;
  }
}
export function writeSessionJson(key: string, value: unknown): void {
  try {
    writeSessionString(key, JSON.stringify(value));
  } catch (err) {
    void err;
  }
}
export function writeSessionString(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
    return;
  } catch (err) {
    void err;
  }
  memorySession.set(key, value);
}
const memoryStorage = new Map<string, string>();
const warnedStorageKeys = new Set<string>();

function warnStorageOnce(key: string, err: unknown): void {
  if (warnedStorageKeys.has(key)) {
    return;
  }
  warnedStorageKeys.add(key);
  console.warn("localStorage unavailable for key " + key + ", falling back to in-memory storage", err);
}

export function readLocalString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    warnStorageOnce(key, err);
    return memoryStorage.get(key) || null;
  }
}
export function writeLocalString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch (err) {
    warnStorageOnce(key, err);
    memoryStorage.set(key, value);
  }
}
export function readLocalJson<T>(key: string): T | null {
  const raw = readLocalString(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch (err) {
    void err;
    return null;
  }
}
export function writeLocalJson(key: string, value: unknown): void {
  try {
    writeLocalString(key, JSON.stringify(value));
  } catch (err) {
    void err;
  }
}
export function debounce(fn: () => void, delay: number): () => void {
  let timer = 0;
  return function (): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, delay);
  };
}
export function onNextFrame(fn: () => void): void {
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(function (): void {
      fn();
    });
  } else {
    window.setTimeout(fn, 16);
  }
}
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const editable = target.closest("input, textarea, select, [contenteditable]");
  return editable !== null;
}
export function isMenuChrome(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const chrome = target.closest("[data-menu], [data-menu-bubble]");
  return chrome !== null;
}
