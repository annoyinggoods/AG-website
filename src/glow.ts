import { hasFinePointer, isEditableTarget, isMenuChrome, prefersReducedMotion } from "./utils-dom.js";
function glowMax(): number {
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue("--glow-max").trim();
  return value.length > 0 ? parseFloat(value) : 70;
}
export function initGlow(): void {
  const glowEl = document.querySelector("[data-glow]");
  if (!(glowEl instanceof HTMLElement)) {
    return;
  }
  const glow: HTMLElement = glowEl;
  if (!hasFinePointer()) {
    return;
  }
  if (prefersReducedMotion()) {
    return;
  }
  glow.style.pointerEvents = "none";
  let targetX = 0;
  let targetY = 0;
  let glowX = 0;
  let glowY = 0;
  let visible = false;
  let running = false;
  let idleTimer = 0;
  document.addEventListener("pointermove", function (event: PointerEvent): void {
    if (shouldSkip(event.target)) {
      setVisible(false);
      pauseLoop();
      return;
    }
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) {
      glowX = targetX;
      glowY = targetY;
      setVisible(true);
    }
    startLoop();
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(pauseLoop, 1200);
  });
  document.addEventListener("scroll", function (): void {
    setVisible(false);
    pauseLoop();
  }, { passive: true });
  window.addEventListener("blur", function (): void {
    setVisible(false);
    pauseLoop();
  });
  function setVisible(next: boolean): void {
    visible = next;
    if (next) {
      glow.classList.add("is-visible");
    } else {
      glow.classList.remove("is-visible");
    }
  }
  function startLoop(): void {
    if (running) {
      return;
    }
    running = true;
    step();
  }
  function pauseLoop(): void {
    running = false;
  }
  function step(): void {
    if (!running) {
      return;
    }
    glowX = glowX + (targetX - glowX) * 0.22;
    glowY = glowY + (targetY - glowY) * 0.22;
    const size = glowSize();
    const half = size / 2;
    glow.style.width = String(size) + "px";
    glow.style.height = String(size) + "px";
    glow.style.setProperty("--x", String(glowX) + "px");
    glow.style.setProperty("--y", String(glowY) + "px");
    window.requestAnimationFrame(step);
  }
}
function shouldSkip(target: EventTarget | null): boolean {
  if (isMenuChrome(target)) {
    return true;
  }
  if (isEditableTarget(target)) {
    return true;
  }
  if (target instanceof Element && target.closest("[data-dragging='true']")) {
    return true;
  }
  if (document.body.classList.contains("is-dragging")) {
    return true;
  }
  return false;
}
function glowSize(): number {
  const size = window.innerWidth * 0.05;
  return Math.min(size, glowMax());
}
