import { onNextFrame, isMenuChrome, isEditableTarget } from "./utils-dom.js";
const DIM_MS = 15000;
const DIM_CLASS = "is-dimmed";
export function initMenuDim() {
    const nav = document.querySelector("[data-menu]");
    if (!(nav instanceof HTMLElement)) {
        return;
    }
    const panel = nav;
    let timer = 0;
    let frameQueued = false;
    let hovering = false;
    let focused = false;
    function shouldSuppress() {
        if (hovering || focused) {
            return true;
        }
        const active = document.activeElement;
        if (active instanceof Element && panel.contains(active)) {
            return true;
        }
        if (isEditableTarget(active)) {
            return true;
        }
        if (panel.classList.contains("is-open")) {
            return true;
        }
        if (document.body.classList.contains("is-dragging")) {
            return true;
        }
        if (document.body.classList.contains("menu-searching")) {
            return true;
        }
        return false;
    }
    function applyDim() {
        if (shouldSuppress()) {
            schedule();
            return;
        }
        panel.classList.add(DIM_CLASS);
    }
    function schedule() {
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
        timer = window.setTimeout(applyDim, DIM_MS);
    }
    function queueActivity() {
        if (frameQueued) {
            return;
        }
        frameQueued = true;
        onNextFrame(function () {
            frameQueued = false;
            schedule();
        });
    }
    void queueActivity;
    panel.addEventListener("mouseenter", function () {
        hovering = true;
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
    });
    panel.addEventListener("mouseleave", function () {
        hovering = false;
        schedule();
    });
    panel.addEventListener("focusin", function () {
        focused = true;
        window.clearTimeout(timer);
        panel.classList.remove(DIM_CLASS);
    });
    panel.addEventListener("focusout", function () {
        focused = false;
        schedule();
    });
    window.addEventListener("pointerdown", function (event) {
        if (isMenuChrome(event.target)) {
            window.clearTimeout(timer);
            panel.classList.remove(DIM_CLASS);
            return;
        }
        queueActivity();
    });
    schedule();
}
//# sourceMappingURL=menu-dim.js.map