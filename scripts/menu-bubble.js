import { readLocalJson, writeLocalJson } from "./utils-dom.js";
const BUBBLE_STORAGE_KEY = "ag-bubble-pos";
const MARGIN = 12;
const TAP_MS = 300;
const TAP_PX = 8;
const SWIPE_VELOCITY = 0.45;
export function initMenuBubble() {
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
export function isMobileLayout() {
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
//# sourceMappingURL=menu-bubble.js.map