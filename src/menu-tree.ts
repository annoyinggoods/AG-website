import { getCanonicalPath, normalizePath, prefersReducedMotion } from "./utils-dom.js";
import { initMenuData } from "./menu-data.js";
const EXPAND_MS = 250;
export function initMenuTree(): void {
  initMenuData();
  const nav = document.querySelector("[data-menu]");
  if (!nav) {
    return;
  }
  upgradeDetailsToButtons(nav);
  closeAllGroups(nav);
  expandActiveBranch(nav);
}
function upgradeDetailsToButtons(nav: Element): void {
  const items = nav.querySelectorAll("li.menu-item");
  items.forEach(function (item: Element): void {
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
    toggle.addEventListener("click", function (): void {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      if (!(childList instanceof HTMLElement)) {
        return;
      }
      if (expanded) {
        toggle.setAttribute("aria-expanded", "false");
        childList.hidden = true;
        styleGroup(childList, true);
      } else {
        toggle.setAttribute("aria-expanded", "true");
        childList.hidden = false;
        styleGroup(childList, true);
      }
    });
    item.setAttribute("data-menu-upgraded", "true");
  });
}
function restoreArrow(link: HTMLAnchorElement): void {
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("class", "menu-arrow");
  arrow.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#icon-arrow-right");
  arrow.appendChild(use);
  link.appendChild(arrow);
}
function styleGroup(group: Element, animate: boolean): void {
  if (!(group instanceof HTMLElement)) {
    return;
  }
  group.style.overflow = "hidden";
  if (animate && !prefersReducedMotion()) {
    group.style.transition = "max-height 240ms ease";
  }
  if ((group as HTMLElement).hidden) {
    group.style.maxHeight = "0";
  } else {
    group.style.maxHeight = "60rem";
    window.setTimeout(function (): void {
      applySettledHeight(group);
    }, EXPAND_MS + 30);
  }
}
function applySettledHeight(group: Element): void {
  if (!(group instanceof HTMLElement) || group.hidden) {
    return;
  }
  group.style.maxHeight = "60rem";
}
function expandActiveBranch(nav: Element): void {
  const current = getCanonicalPath();
  const active = findLinkByPath(nav, current);
  if (!active) {
    return;
  }
  let cursor: Element | null = active.closest("li.menu-item");
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
function findLinkByPath(nav: Element, current: string): HTMLAnchorElement | null {
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
function openGroup(group: Element): void {
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
function openParentGroups(group: Element): void {
  let cursor: Element | null = group.parentElement;
  while (cursor) {
    if (cursor instanceof HTMLElement && cursor.hasAttribute("data-menu-group")) {
      openGroup(cursor);
    }
    cursor = cursor.parentElement;
  }
}
function closeAllGroups(nav: Element): void {
  const toggles = nav.querySelectorAll(".menu-toggle");
  toggles.forEach(function (toggle: Element): void {
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  const groups = nav.querySelectorAll("[data-menu-group]");
  groups.forEach(function (group: Element): void {
    if (group instanceof HTMLElement) {
      group.hidden = true;
      group.style.maxHeight = "0";
    }
  });
}
