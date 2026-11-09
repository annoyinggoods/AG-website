import { isSameSiteUrl, isDownloadHref, prefersReducedMotion, writeSessionString, readSessionString } from "./utils-dom.js";
const INCOMING_KEY = "ag-transition-incoming";
const MARKER_KEY = "ag-menu-marker";
const SHAKE_MS = 200;
const TRANSITION_DROP_MS = 700;
const OUTGOING_MS = 900;
export function initTransitions() {
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
//# sourceMappingURL=transitions.js.map