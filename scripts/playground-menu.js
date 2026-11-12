import { prefersReducedMotion } from "./utils-dom.js";
const UNROLL_MS = 320;
const OVERSHOOT_BEZIER = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EDGE_MARGIN = 12;
export function initPlaygroundMenu() {
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
//# sourceMappingURL=playground-menu.js.map