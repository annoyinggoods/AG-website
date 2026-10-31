import { onNextFrame, isMenuChrome, isEditableTarget } from "./utils-dom.js";
const DIM_MS = 15000;
const DIM_CLASS = "is-dimmed";
export function initMenuDim(): void {
  const nav = document.querySelector("[data-menu]");
  if (!(nav instanceof HTMLElement)) {
    return;
  }
  const panel: HTMLElement = nav;
  let timer = 0;
  let frameQueued = false;
  let hovering = false;
  let focused = false;
  function shouldSuppress(): boolean {
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
  function applyDim(): void {
    if (shouldSuppress()) {
      schedule();
      return;
    }
    panel.classList.add(DIM_CLASS);
  }
  function schedule(): void {
    window.clearTimeout(timer);
    panel.classList.remove(DIM_CLASS);
    timer = window.setTimeout(applyDim, DIM_MS);
  }
  function queueActivity(): void {
    if (frameQueued) {
      return;
    }
    frameQueued = true;
    onNextFrame(function (): void {
      frameQueued = false;
      schedule();
    });
  }
  void queueActivity;
  panel.addEventListener("mouseenter", function (): void {
    hovering = true;
    window.clearTimeout(timer);
    panel.classList.remove(DIM_CLASS);
  });
  panel.addEventListener("mouseleave", function (): void {
    hovering = false;
    schedule();
  });
  panel.addEventListener("focusin", function (): void {
    focused = true;
    window.clearTimeout(timer);
    panel.classList.remove(DIM_CLASS);
  });
  panel.addEventListener("focusout", function (): void {
    focused = false;
    schedule();
  });
  window.addEventListener("pointerdown", function (event: PointerEvent): void {
    if (isMenuChrome(event.target)) {
      window.clearTimeout(timer);
      panel.classList.remove(DIM_CLASS);
      return;
    }
    queueActivity();
  });
  schedule();
}
