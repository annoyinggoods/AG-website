import { hasFinePointer, isMenuChrome, onNextFrame, prefersReducedMotion } from "./utils-dom.js";
const ZOOM = 3;
function lensMax() {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue("--lens-max").trim();
    return value.length > 0 ? parseFloat(value) : 1420;
}
export function initLens() {
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
        if (isOverHero(event.clientX, event.clientY) || isLightboxOpen()) {
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
//# sourceMappingURL=lens.js.map