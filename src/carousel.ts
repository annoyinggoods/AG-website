import { prefersReducedMotion } from "./utils-dom.js";
export function initCarousel(): void {
  upgradeMediaRows();
  wireCarousels();
}
function upgradeMediaRows(): void {
  const rows = document.querySelectorAll(".media-row, .feature-media, .story-media");
  rows.forEach(function (row: Element, index: number): void {
    if (!(row instanceof HTMLElement)) {
      return;
    }
    const figures = row.querySelectorAll("figure");
    if (figures.length <= 2) {
      return;
    }
    if (row.closest(".carousel")) {
      return;
    }
    buildCarousel(row, index);
  });
}
function buildCarousel(row: HTMLElement, index: number): void {
  const figures: HTMLElement[] = [];
  row.querySelectorAll("figure").forEach(function (fig: Element): void {
    if (fig instanceof HTMLElement) {
      figures.push(fig);
    }
  });
  const region = document.createElement("div");
  region.className = "carousel";
  region.setAttribute("role", "region");
  region.setAttribute("aria-roledescription", "carousel");
  region.setAttribute("aria-label", row.getAttribute("data-carousel-label") || "Image carousel");
  region.setAttribute("tabindex", "0");
  const autoplay = row.getAttribute("data-autoplay");
  if (autoplay !== null) {
    region.setAttribute("data-autoplay", autoplay);
  }
  const track = document.createElement("div");
  track.className = "carousel-track";
  for (let i = 0; i < figures.length; i = i + 1) {
    const figure = figures[i];
    if (!figure) {
      continue;
    }
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    const slideId = "carousel-slide-" + index + "-" + String(i);
    slide.setAttribute("id", slideId);
    slide.setAttribute("role", "tabpanel");
    slide.setAttribute("aria-labelledby", "carousel-tab-" + index + "-" + String(i));
    slide.appendChild(figure);
    track.appendChild(slide);
  }
  region.appendChild(track);
  const parent = row.parentElement;
  if (parent) {
    parent.replaceChild(region, row);
  }
}

function wireCarousels(): void {
  const carousels = document.querySelectorAll(".carousel");
  carousels.forEach(function (root: Element, index: number): void {
    if (root instanceof HTMLElement) {
      wireOne(root, index);
    }
  });
}
function wireOne(root: HTMLElement, index: number): void {
  const trackEl = root.querySelector(".carousel-track");
  const slides = root.querySelectorAll(".carousel-slide");
  if (!(trackEl instanceof HTMLElement) || slides.length === 0) {
    return;
  }
  ensureFocusable(root);
  const track: HTMLElement = trackEl;
  const label = root.getAttribute("aria-label") || "Carousel " + String(index + 1);
  let current = 0;
  const live = document.createElement("p");
  live.className = "carousel-status";
  live.setAttribute("aria-live", "polite");
  root.appendChild(live);
  const prev = ensureButton(root, "carousel-prev", "Previous slide", "Previous");
  const next = ensureButton(root, "carousel-next", "Next slide", "Next");
  const slideIds = prepareSlides(root, index);
  const dotsHost = ensureDots(root, slides.length, slideIds, index);
  const dots = dotsHost.querySelectorAll(".carousel-dot");
  prev.addEventListener("click", function (): void {
    current = showSlide(track, slides, dots, live, label, current - 1);
    restartAutoplay();
  });
  next.addEventListener("click", function (): void {
    current = showSlide(track, slides, dots, live, label, current + 1);
    restartAutoplay();
  });
  dots.forEach(function (dot: Element, dotIndex: number): void {
    dot.addEventListener("click", function (): void {
      current = showSlide(track, slides, dots, live, label, dotIndex);
      restartAutoplay();
    });
  });
  root.addEventListener("keydown", function (event: KeyboardEvent): void {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      current = showSlide(track, slides, dots, live, label, current - 1);
      restartAutoplay();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      current = showSlide(track, slides, dots, live, label, current + 1);
      restartAutoplay();
    } else if (event.key === "Home") {
      event.preventDefault();
      current = showSlide(track, slides, dots, live, label, 0);
      restartAutoplay();
    } else if (event.key === "End") {
      event.preventDefault();
      current = showSlide(track, slides, dots, live, label, slides.length - 1);
      restartAutoplay();
    }
  });
  showSlide(track, slides, dots, live, label, 0);
  let autoTimer = 0;
  const autoplay = root.getAttribute("data-autoplay");
  if (autoplay !== null && !prefersReducedMotion()) {
    startAutoplay();
  }
  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", startAutoplay);
  document.addEventListener("visibilitychange", function (): void {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });
  function startAutoplay(): void {
    if (autoplay === null) {
      return;
    }
    stopAutoplay();
    autoTimer = window.setTimeout(function (): void {
      if (document.hidden) {
        return;
      }
      current = showSlide(track, slides, dots, live, label, current + 1);
      startAutoplay();
    }, 6000);
  }
  function stopAutoplay(): void {
    window.clearTimeout(autoTimer);
  }
  function restartAutoplay(): void {
    if (autoplay === null) {
      return;
    }
    startAutoplay();
  }
}
// Every slide is a tab panel. The markup may be written by hand, so the
// roles and the ids are repaired here.
function prepareSlides(root: HTMLElement, index: number): string[] {
  const slides = root.querySelectorAll(".carousel-slide");
  const ids: string[] = [];
  slides.forEach(function (slide: Element, position: number): void {
    if (!(slide instanceof HTMLElement)) {
      return;
    }
    const slideId = slide.getAttribute("id") || "carousel-slide-" + index + "-" + String(position);
    slide.setAttribute("id", slideId);
    slide.setAttribute("role", "tabpanel");
    slide.setAttribute("aria-labelledby", "carousel-tab-" + index + "-" + String(position));
    ids.push(slideId);
  });
  return ids;
}
// The region carries the arrow keys, so it has to be reachable with the
// keyboard even when the markup was written by hand.
function ensureFocusable(root: HTMLElement): void {
  if (!root.hasAttribute("tabindex")) {
    root.setAttribute("tabindex", "0");
  }
}
function ensureButton(root: HTMLElement, className: string, label: string, text: string): HTMLButtonElement {
  const existing = root.querySelector("." + className);
  if (existing instanceof HTMLButtonElement) {
    return existing;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  root.appendChild(button);
  return button;
}
function ensureDots(root: HTMLElement, count: number, slideIds: string[], tabIndex: number): HTMLElement {
  const existing = root.querySelector(".carousel-dots");
  if (existing instanceof HTMLElement && existing.querySelectorAll(".carousel-dot").length === count) {
    return normalizeDots(existing, slideIds, tabIndex);
  }
  if (existing instanceof HTMLElement) {
    existing.remove();
  }
  const host = document.createElement("div");
  host.className = "carousel-dots";
  host.setAttribute("role", "tablist");
  host.setAttribute("aria-label", "Slide dots");
  for (let i = 0; i < count; i = i + 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    dot.id = "carousel-tab-" + tabIndex + "-" + String(i);
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
    dot.setAttribute("aria-label", "Go to slide " + String(i + 1));
    if (slideIds[i]) {
      dot.setAttribute("aria-controls", slideIds[i]!);
    }
    dot.tabIndex = i === 0 ? 0 : -1;
    host.appendChild(dot);
  }
  root.appendChild(host);
  return normalizeDots(host, slideIds, tabIndex);
}

// A dot is the tab that shows one slide, so it needs the id of the panel it
// controls. Hand written markup gets the same treatment as generated markup.
function normalizeDots(host: HTMLElement, slideIds: string[], tabIndex: number): HTMLElement {
  const dots = host.querySelectorAll(".carousel-dot");
  dots.forEach(function (dot: Element, position: number): void {
    if (!(dot instanceof HTMLElement)) {
      return;
    }
    dot.id = "carousel-tab-" + tabIndex + "-" + String(position);
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", "Go to slide " + String(position + 1));
    if (slideIds[position]) {
      dot.setAttribute("aria-controls", slideIds[position]!);
    }
    if (!dot.hasAttribute("aria-selected")) {
      dot.setAttribute("aria-selected", position === 0 ? "true" : "false");
    }
    dot.tabIndex = position === 0 ? 0 : -1;
  });
  return host;
}
function showSlide(
  track: HTMLElement,
  slides: NodeListOf<Element>,
  dots: NodeListOf<Element>,
  live: HTMLElement,
  label: string,
  next: number
): number {
  const count = slides.length;
  if (count === 0) {
    return 0;
  }
  let current = next;
  if (current < 0) {
    current = count - 1;
  }
  if (current >= count) {
    current = 0;
  }
  const offset = current * 100;
  track.style.transform = "translateX(-" + String(offset) + "%)";
  dots.forEach(function (dot: Element, dotIndex: number): void {
    dot.setAttribute("aria-selected", dotIndex === current ? "true" : "false");
    if (dot instanceof HTMLElement) {
      dot.tabIndex = dotIndex === current ? 0 : -1;
    }
  });
  slides.forEach(function (slide: Element, slideIndex: number): void {
    if (slideIndex === current) {
      slide.removeAttribute("aria-hidden");
      return;
    }
    slide.setAttribute("aria-hidden", "true");
  });
  live.textContent = label + ": slide " + String(current + 1) + " of " + String(count) + ".";
  return current;
}
