import { getCanonicalPath, normalizePath } from "./utils-dom.js";
export function initPageState(): void {
  const current = getCanonicalPath();
  highlightActiveLink(current);
  markParentSections();
  markBranchLevels();
  keepStateFresh();
}
function highlightActiveLink(current: string): void {
  const links = document.querySelectorAll("a.menu-link");
  links.forEach(function (el: Element): void {
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
function pickBestLink(links: NodeListOf<Element>, current: string): HTMLAnchorElement | null {
  let best: HTMLAnchorElement | null = null;
  let bestScore = -1;
  links.forEach(function (el: Element): void {
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
function scoreLink(href: string, current: string): number {
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
function markParentSections(): void {
  document.querySelectorAll("li.menu-item.is-parent-section").forEach(function (el: Element): void {
    el.classList.remove("is-parent-section");
  });
  const active = document.querySelector("a.menu-link[aria-current='page']");
  if (!active) {
    return;
  }
  let cursor: Element | null = active.closest("li.menu-item");
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
function keepStateFresh(): void {
  window.addEventListener("pageshow", function (): void {
    const current = getCanonicalPath();
    highlightActiveLink(current);
    markParentSections();
    markBranchLevels();
  });
}

const BRANCH_SHADE_STEPS = 6;

function markBranchLevels(): void {
  document.querySelectorAll("[data-branch-level]").forEach(function (el: Element): void {
    el.removeAttribute("data-branch-level");
  });
  const active = document.querySelector("a.menu-link[aria-current='page']");
  if (!active) {
    return;
  }
  const chain: Element[] = [];
  let cursor: Element | null = active.closest("li.menu-item");
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
