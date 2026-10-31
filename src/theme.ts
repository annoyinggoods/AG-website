import { prefersReducedMotion, readLocalString, writeLocalString } from "./utils-dom.js";
const THEME_STORAGE_KEY = "ag-theme";
const THEME_STORAGE_VERSION = 2;
const THEME_CROSSFADE_MS = 340;
const HERO_FORWARD = "hero-web-layer-forward";
const HERO_RETURN = "hero-web-layer-return";
type ThemeChoice = "light" | "dark";
interface ThemeRecord {
  theme: ThemeChoice;
  version: number;
}
interface MediaQueryListLike {
  matches: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  addListener?: (listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
}
type ThemeListener = () => void;
let systemQuery: MediaQueryListLike | null = null;
let systemListener: ThemeListener | null = null;
export function initTheme(): void {
  const root = document.documentElement;
  const saved = readTheme();
  if (saved) {
    applyTheme(root, saved, false);
  } else {
    applyTheme(root, systemTheme(), false);
    watchSystemTheme(root);
  }
  syncThemeControls(root);
  wirePill(root);
  wireThemeMessaging(root);
}
export function currentTheme(root: HTMLElement = document.documentElement): ThemeChoice {
  return root.getAttribute("data-theme") === "light" ? "light" : "dark";
}
function readTheme(): ThemeChoice | null {
  const raw = readLocalString(THEME_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (err) {
    void err;
    return readLegacyTheme(raw);
  }
  if (typeof parsed === "string") {
    return readLegacyTheme(parsed);
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Partial<ThemeRecord>;
    if (record.version !== undefined && record.version !== THEME_STORAGE_VERSION) {
      return null;
    }
    if (record.theme === "light" || record.theme === "dark") {
      return record.theme;
    }
  }
  return null;
}
function readLegacyTheme(raw: string): ThemeChoice | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (trimmed === "light" || trimmed === "dark") {
    return trimmed;
  }
  return null;
}
function saveTheme(theme: ThemeChoice): void {
  const record: ThemeRecord = { theme: theme, version: THEME_STORAGE_VERSION };
  writeLocalString(THEME_STORAGE_KEY, JSON.stringify(record));
}
function systemTheme(): ThemeChoice {
  if (typeof window.matchMedia !== "function") {
    return "dark";
  }
  const query = window.matchMedia("(prefers-color-scheme: light)");
  return query.matches ? "light" : "dark";
}
function watchSystemTheme(root: HTMLElement): void {
  stopSystemWatch();
  if (typeof window.matchMedia !== "function") {
    return;
  }
  const query = window.matchMedia("(prefers-color-scheme: light)") as unknown as MediaQueryListLike;
  systemQuery = query;
  systemListener = function (): void {
    if (readTheme()) {
      stopSystemWatch();
      return;
    }
    applyTheme(root, systemTheme(), true);
  };
  const listener: ThemeListener = systemListener;
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
  } else if (typeof query.addListener === "function") {
    query.addListener(listener);
  }
}
function stopSystemWatch(): void {
  if (systemQuery && systemListener) {
    const query = systemQuery;
    const listener = systemListener;
    if (typeof query.removeEventListener === "function") {
      query.removeEventListener("change", listener);
    } else if (typeof query.removeListener === "function") {
      query.removeListener(listener);
    }
  }
  systemQuery = null;
  systemListener = null;
}
function applyTheme(root: HTMLElement, theme: ThemeChoice, announce: boolean): void {
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
function syncMetaTheme(theme: ThemeChoice): void {
  const metas = document.querySelectorAll("meta[name='theme-color']");
  metas.forEach(function (node: Element): void {
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
function syncThemeControls(root: HTMLElement): void {
  syncPillButtons(currentTheme(root));
}
function syncPillButtons(theme: ThemeChoice): void {
  const pills = document.querySelectorAll("[data-theme-choice]");
  pills.forEach(function (node: Element): void {
    if (!(node instanceof HTMLButtonElement)) {
      return;
    }
    const choice = node.getAttribute("data-theme-choice") || "";
    node.setAttribute("aria-pressed", choice === theme ? "true" : "false");
  });
}
function wirePill(root: HTMLElement): void {
  const pills = document.querySelectorAll("[data-theme-choice]");
  let preloaded = false;
  const preloadOnce = function (): void {
    if (preloaded) {
      return;
    }
    preloaded = true;
    preloadAlternateWebs();
  };
  pills.forEach(function (node: Element): void {
    if (!(node instanceof HTMLButtonElement)) {
      return;
    }
    const choice = node.getAttribute("data-theme-choice") as ThemeChoice;
    node.addEventListener("click", function (): void {
      if (currentTheme(root) !== choice) {
        applyTheme(root, choice, true);
        saveTheme(choice);
        stopSystemWatch();
      }
    });
    node.addEventListener("pointerenter", preloadOnce);
    node.addEventListener("focus", preloadOnce);
  });
}
function flipTheme(root: HTMLElement, persist: boolean): void {
  const current = currentTheme(root);
  const next: ThemeChoice = current === "dark" ? "light" : "dark";
  if (persist) {
    saveTheme(next);
    stopSystemWatch();
  }
  applyTheme(root, next, true);
}
function swapThemeAssets(root: HTMLElement, theme: ThemeChoice): void {
  void root;
  swapHeroWebLayers(theme);
}
function swapHeroWebLayers(theme: ThemeChoice): void {
  swapHeroLayer(HERO_FORWARD, "/assets/hero/web-plain-" + theme + ".webp");
  swapHeroLayer(HERO_RETURN, "/assets/hero/web-words-" + theme + ".webp");
}
function swapHeroLayer(layerClass: string, src: string): void {
  const layers = document.querySelectorAll("." + layerClass);
  layers.forEach(function (node: Element): void {
    if (node instanceof HTMLImageElement) {
      if (node.getAttribute("src") !== src) {
        node.setAttribute("src", src);
      }
      return;
    }
    const nested = node.querySelectorAll("img");
    nested.forEach(function (img: Element): void {
      if (img instanceof HTMLImageElement && img.getAttribute("src") !== src) {
        img.setAttribute("src", src);
      }
    });
  });
}
function crossfadeBackground(root: HTMLElement, previous: ThemeChoice, next: ThemeChoice): void {
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
  window.setTimeout(function (): void {
    layer.classList.remove("is-crossfading");
    layer.style.setProperty("--bg-old", incoming);
  }, THEME_CROSSFADE_MS);
}
function wireThemeMessaging(root: HTMLElement): void {
  window.addEventListener("storage", function (event: StorageEvent): void {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    const next = readTheme();
    if (!next || next === currentTheme(root)) {
      return;
    }
    stopSystemWatch();
    applyTheme(root, next, false);
  });
}
function announceTheme(theme: ThemeChoice): void {
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
function preloadAlternateWebs(): void {
  const other: ThemeChoice = currentTheme() === "dark" ? "light" : "dark";
  const pairs = [
    "/assets/hero/web-plain-" + other + ".webp",
    "/assets/hero/web-words-" + other + ".webp"
  ];
  const preload = function (): void {
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
    window.requestAnimationFrame(function (): void {
      window.setTimeout(preload, 0);
    });
  } else {
    window.setTimeout(preload, 16);
  }
}
