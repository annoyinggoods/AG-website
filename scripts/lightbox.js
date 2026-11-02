const LIGHTBOX_SELECTOR = "[data-lightbox]";
let overlay = null;
let frameImage = null;
let closeButton = null;
let opener = null;
export function initLightbox() {
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
//# sourceMappingURL=lightbox.js.map