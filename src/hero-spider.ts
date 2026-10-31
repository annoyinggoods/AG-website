import { isReloadNavigation, prefersReducedMotion, readLocalJson, writeLocalJson } from "./utils-dom.js";
import { buildGate } from "./hero-gate.js";
import { WEB_VERTICES } from "./hero-geometry.js";
import { buildPath, walkPath, headingDeg, revealPlain, revealWords, placeSprite } from "./hero-walk.js";
import { initHeroBall, parkBallInMenu, runBallChoreo } from "./hero-ball.js";

const SPIDER_INTRO_KEY = "ag-hero-intro";
const SPIDER_INTRO_VERSION = 1;

const BLINK_PERIOD_MS = 1700;
const BLINK_FRAME_MS = 1700;
const BLINK_CYCLES = 2;
const LOGO_MS = 1400;
const TO_CORNER_MS = 2400;
const WEAVE_MS = 5600;
const RETURN_MS = 5600;
const MORPH_MS = 1600;
const VANISH_MS = 1200;
const WEAVE_LEGS = 9;
const WALK_BOB = 7;

const ASSET_ROOT = "/assets/hero/";

type HeroState = "idle" | "blink" | "to-corner" | "weave" | "return" | "vanish" | "morph" | "settle" | "done";

let currentState: HeroState = "idle";
let pendingSleeps: Array<() => void> = [];

export function getHeroState(): HeroState {
  return currentState;
}

function setHeroState(state: HeroState): void {
  currentState = state;
  const hero = document.querySelector("[data-hero-anim]");
  if (hero instanceof HTMLElement) {
    hero.setAttribute("data-hero-state", state);
  }
  (window as { __heroState?: string }).__heroState = state;
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve): void {
    let settled = false;
    const finish = function (): void {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    pendingSleeps.push(finish);
    window.setTimeout(finish, ms);
  });
}

function flushSleeps(): void {
  const list = pendingSleeps.splice(0, pendingSleeps.length);
  for (let i = 0; i < list.length; i += 1) {
    const finish = list[i];
    if (finish) {
      finish();
    }
  }
}

function show(el: HTMLElement | null, visible: boolean): void {
  if (!el) {
    return;
  }
  el.style.opacity = visible ? "1" : "0";
}

function clearInHeroBall(hero: HTMLElement): void {
  const b = hero.querySelector(".hero-ball");
  if (b instanceof HTMLElement) {
    b.style.opacity = "0";
  }
}

function isHome(hero: HTMLElement): boolean {
  return hero.hasAttribute("data-hero-anim-full");
}

export function initHeroSpider(): void {
  const hero = document.querySelector("[data-hero-anim]");
  if (!(hero instanceof HTMLElement)) {
    return;
  }
  ensureLayers(hero);
  initHeroBall();
  document.addEventListener("visibilitychange", function (): void {
    // A hidden tab must not keep the 21s weave waiting on timers; the sleep
    // chain collapses so the sequence is settled when the visitor returns.
    if (document.hidden && currentState !== "idle" && currentState !== "done") {
      flushSleeps();
    }
  });
  void runHome(hero);
}

async function runHome(hero: HTMLElement): Promise<void> {
  if (!isHome(hero)) {
    hideStartPrompt(hero);
    showRestingBall(hero);
    await parkBallInMenu();
    return;
  }
  const stored = readLocalJson<{ version: number; done: boolean }>(SPIDER_INTRO_KEY);
  const replay = isReloadNavigation();
  if (!replay && stored && stored.version === SPIDER_INTRO_VERSION && stored.done) {
    hideStartPrompt(hero);
    showRestingBall(hero);
    await parkBallInMenu();
    return;
  }
  if (prefersReducedMotion()) {
    jumpToDone(hero);
    await parkBallInMenu();
    writeLocalJson(SPIDER_INTRO_KEY, { version: SPIDER_INTRO_VERSION, done: true });
    return;
  }
  const gate = buildGate();
  if (!gate) {
    showRestingBall(hero);
    return;
  }
  wireStartButton(gate);
  hideStartPrompt(hero);
  await gate.dismissed;
  await runSequence(hero);
  writeLocalJson(SPIDER_INTRO_KEY, { version: SPIDER_INTRO_VERSION, done: true });
}

function hideStartPrompt(hero: HTMLElement): void {
  const prompt = hero.querySelector(".hero-prompt");
  if (prompt instanceof HTMLElement) {
    prompt.hidden = true;
  }
  const start = hero.querySelector("[data-hero-start]");
  if (start instanceof HTMLElement) {
    start.hidden = true;
  }
}

function wireStartButton(gate: { element: HTMLElement }): void {
  const start = document.querySelector("[data-hero-start]");
  if (!(start instanceof HTMLElement)) {
    return;
  }
  start.addEventListener("click", function (): void {
    gate.element.click();
  });
}

async function runSequence(hero: HTMLElement): Promise<void> {
  // The logo beat swaps the sprite mid-run; fetching it now, while the blink
  // cycles run, keeps the swap from stalling on a cold decode.
  preloadSources([ASSET_ROOT + "spider-blink-logo.webp"]);
  await materializeSprites(hero);
  const plain = hero.querySelector(".hero-sprite-plain") as HTMLImageElement | null;
  const walkImg = hero.querySelector(".hero-sprite-walk") as HTMLImageElement | null;
  const blinkImg = hero.querySelector(".hero-sprite-blink") as HTMLImageElement | null;
  const vanishImg = hero.querySelector(".hero-sprite-disappear") as HTMLImageElement | null;
  const webPlain = hero.querySelector("[data-ha-web='plain']") as HTMLElement | null;
  const webWords = hero.querySelector("[data-ha-web='words']") as HTMLElement | null;

  const boxes = [
    document.querySelector(".title-box"),
    document.querySelector(".main-box"),
    document.querySelector(".menu-box"),
  ];
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    if (box instanceof HTMLElement) {
      box.classList.add("is-hidden");
    }
  }

  const heroRect = hero.getBoundingClientRect();
  const webRect = (webPlain ?? hero).getBoundingClientRect();
  const webW = webRect.width;
  const webH = webRect.height;
  const topRight: [number, number] = [
    webRect.left + WEB_VERTICES.topRight.x * webW,
    webRect.top + WEB_VERTICES.topRight.y * webH,
  ];
  const leftEdgeX = webRect.left + WEB_VERTICES.topLeft.x * webW;
  const leftSurfaceY = webRect.top + webH * 0.72;

  setHeroState("idle");
  show(plain, true);
  show(walkImg, false);
  show(blinkImg, false);
  show(vanishImg, false);
  placeSprite(plain!, hero, heroRect.left + heroRect.width / 2, heroRect.top + heroRect.height / 2, 0);

  await runBlink(hero, plain, blinkImg);
  await runLogoBeat(hero, plain);

  setHeroState("to-corner");
  show(walkImg, true);
  show(plain, false);
  const start: [number, number] = [heroRect.left + heroRect.width / 2, heroRect.top + heroRect.height / 2];
  await walkPath(hero, [start, topRight], TO_CORNER_MS, (x, y, rot, step) => {
    const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
    placeSprite(walkImg!, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
    applyWebTorque(hero, rot);
  });

  setHeroState("weave");
  if (webPlain) {
    webPlain.style.opacity = "1";
    revealPlain(webPlain, 0);
  }
  const webTopY = webRect.top + webH * 0.05;
  const path = buildPath(topRight, leftEdgeX, leftSurfaceY, webTopY, WEAVE_LEGS);
  await walkPath(hero, path, WEAVE_MS, (x, y, rot, step) => {
    const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
    placeSprite(walkImg!, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
    applyWebTorque(hero, rot);
    if (webPlain) {
      revealPlain(webPlain, x - webRect.left);
    }
  });
  if (webPlain) {
    revealPlain(webPlain, 0);
  }

  revealBoxes(boxes);

  setHeroState("return");
  if (webWords) {
    webWords.style.opacity = "1";
  }
  await walkPath(hero, path.slice().reverse(), RETURN_MS, (x, y, rot, step) => {
    const bob = step % 2 === 0 ? -WALK_BOB : WALK_BOB;
    placeSprite(walkImg!, hero, x, y + bob, rot + (step % 2 === 0 ? -4 : 4));
    applyWebTorque(hero, rot);
    if (webWords) {
      revealWords(webWords, x - webRect.left, webW);
    }
  });
  if (webWords) {
    revealWords(webWords, webW, webW);
  }

  setHeroState("vanish");
  show(walkImg, false);
  if (vanishImg) {
    placeSprite(vanishImg, hero, topRight[0], topRight[1], 0);
    show(vanishImg, true);
  }
  await sleep(VANISH_MS);
  show(vanishImg, false);

  setHeroState("morph");
  if (plain) {
    placeSprite(plain, hero, topRight[0], topRight[1], 0);
    plain.style.transition = "opacity " + String(MORPH_MS) + "ms ease";
    plain.style.opacity = "0";
  }
  await sleep(MORPH_MS);

  setHeroState("settle");
  await runBallChoreo();

  setHeroState("done");
  show(plain, false);
  updateDesc("Intro complete: the web is fully woven, the boxes are open, and the logo ball is parked in the menu.");
  clearInHeroBall(hero);
  showRestingBall(hero);
  if (plain) {
    plain.style.transition = "";
    plain.src = ASSET_ROOT + "spider-plain.webp";
  }
}

async function runBlink(
  hero: HTMLElement,
  plain: HTMLImageElement | null,
  blinkImg: HTMLImageElement | null,
): Promise<void> {
  setHeroState("blink");
  for (let cycle = 0; cycle < BLINK_CYCLES; cycle += 1) {
    const wait = cycle === 0 ? 0 : BLINK_PERIOD_MS - BLINK_FRAME_MS;
    await sleep(wait);
    show(plain, false);
    show(blinkImg, true);
    if (blinkImg) {
      placeSprite(blinkImg, hero, hero.getBoundingClientRect().left + hero.getBoundingClientRect().width / 2, hero.getBoundingClientRect().top + hero.getBoundingClientRect().height / 2, 0);
    }
    await sleep(BLINK_FRAME_MS);
    show(blinkImg, false);
    show(plain, true);
  }
}
async function runLogoBeat(hero: HTMLElement, plain: HTMLImageElement | null): Promise<void> {
  if (!plain) {
    return;
  }
  const previous = plain.getAttribute("src") || "";
  const rect = hero.getBoundingClientRect();
  plain.src = ASSET_ROOT + "spider-blink-logo.webp";
  placeSprite(plain, hero, rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
  show(plain, true);
  await sleep(LOGO_MS);
  plain.src = previous;
  placeSprite(plain, hero, rect.left + rect.width / 2, rect.top + rect.height / 2, 0);
}

function revealBoxes(boxes: Array<Element | null>): void {
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    if (box instanceof HTMLElement) {
      box.classList.remove("is-hidden");
      box.classList.add("is-entering");
    }
  }
}

// The spider carries a torque while it walks, so the web turns with it around
// its topmost tip.
function applyWebTorque(hero: HTMLElement, angle: number): void {
  const layers = hero.querySelectorAll(".ha-web");
  layers.forEach(function (node: Element): void {
    if (node instanceof HTMLElement) {
      node.style.transform = "rotate(" + angle.toFixed(2) + "deg)";
    }
  });
}

function updateDesc(text: string): void {
  let desc = document.querySelector("[data-ha-desc]");
  if (!(desc instanceof HTMLElement)) {
    desc = document.createElement("div");
    desc.setAttribute("data-ha-desc", "");
    desc.setAttribute("aria-live", "polite");
    desc.className = "hero-sr-only";
    document.body.appendChild(desc);
  }
  desc.textContent = text;
}

function webs(): string[] {
  const theme = readThemeChoice();
  return [
    ASSET_ROOT + "web-plain-" + theme + ".webp",
    ASSET_ROOT + "web-words-" + theme + ".webp"
  ];
}

function readThemeChoice(): string {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" ? "light" : "dark";
}

function preloadSources(sources: string[]): void {
  for (let i = 0; i < sources.length; i += 1) {
    const src = sources[i];
    if (!src) {
      continue;
    }
    const loader = new Image();
    loader.decoding = "async";
    loader.src = src;
  }
}

function ensureLayers(hero: HTMLElement): void {
  const stage = hero.querySelector(".hero-stage");
  if (!(stage instanceof HTMLElement)) {
    return;
  }
  const theme = readThemeChoice();
  ensureLayer(hero, stage, "hero-web-layer hero-web-layer-forward", ASSET_ROOT + "web-plain-" + theme + ".webp");
  ensureLayer(hero, stage, "hero-web-layer hero-web-layer-return", ASSET_ROOT + "web-words-" + theme + ".webp");
  ensureLayer(hero, stage, "hero-sprite hero-sprite-plain", ASSET_ROOT + "spider-plain.webp", true);
  ensureLayer(hero, stage, "hero-sprite hero-sprite-walk", ASSET_ROOT + "spider-walk.webp", true);
  ensureLayer(hero, stage, "hero-sprite hero-sprite-blink", ASSET_ROOT + "spider-blink-eye.webp", true);
  ensureLayer(hero, stage, "hero-sprite hero-sprite-disappear", ASSET_ROOT + "spider-disappear.webp", true);
  ensureLayer(hero, stage, "hero-sprite hero-ball", ASSET_ROOT + "ball.webp");
  const forward = hero.querySelector(".hero-web-layer-forward");
  const ret = hero.querySelector(".hero-web-layer-return");
  if (forward instanceof HTMLElement) {
    forward.classList.add("ha-web");
    forward.setAttribute("data-ha-web", "plain");
  }
  if (ret instanceof HTMLElement) {
    ret.classList.add("ha-web");
    ret.setAttribute("data-ha-web", "words");
  }
  preloadSources(webs());
  watchThemeSwaps(hero);
}

// The sprite plates weigh more than a megabyte together, and the sequence
// only starts when the visitor asks for it, so the plates are fetched when
// the weaving begins instead of with the page.
async function materializeSprites(hero: HTMLElement): Promise<void> {
  const layers = hero.querySelectorAll(".hero-sprite");
  const pending: Array<Promise<void>> = [];
  layers.forEach(function (layer: Element): void {
    if (!(layer instanceof HTMLImageElement)) {
      return;
    }
    const deferred = layer.getAttribute("data-src");
    if (!deferred) {
      return;
    }
    layer.setAttribute("src", deferred);
    layer.removeAttribute("data-src");
    pending.push(waitForImage(layer));
  });
  await Promise.all(pending);
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  return new Promise(function (resolve): void {
    if (image.complete) {
      resolve();
      return;
    }
    image.addEventListener("load", function (): void { resolve(); }, { once: true });
    image.addEventListener("error", function (): void { resolve(); }, { once: true });
  });
}

function ensureLayer(hero: HTMLElement, stage: HTMLElement, className: string, src: string, deferred?: boolean): void {
  const first = className.split(" ")[1] || className;
  const found = hero.querySelector("." + first);
  if (found instanceof HTMLImageElement) {
    if (deferred === true) {
      if (found.getAttribute("data-src") !== src) {
        found.setAttribute("data-src", src);
      }
      return;
    }
    if (found.getAttribute("src") !== src) {
      found.setAttribute("src", src);
    }
    return;
  }
  if (found) {
    return;
  }
  const layer = document.createElement("img");
  layer.className = className;
  if (deferred === true) {
    layer.setAttribute("data-src", src);
  } else {
    layer.src = src;
  }
  layer.alt = "";
  layer.setAttribute("aria-hidden", "true");
  layer.decoding = "async";
  hero.insertBefore(layer, stage);
}

function watchThemeSwaps(hero: HTMLElement): void {
  if (hero.getAttribute("data-theme-wired") === "true") {
    return;
  }
  hero.setAttribute("data-theme-wired", "true");
  const observer = new MutationObserver(function (): void {
    if (!document.body.contains(hero)) {
      observer.disconnect();
      return;
    }
    const theme = readThemeChoice();
    swapWebLayer(hero, "hero-web-layer-forward", ASSET_ROOT + "web-plain-" + theme + ".webp");
    swapWebLayer(hero, "hero-web-layer-return", ASSET_ROOT + "web-words-" + theme + ".webp");
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

function swapWebLayer(hero: HTMLElement, layerClass: string, src: string): void {
  const layer = hero.querySelector("." + layerClass);
  if (layer instanceof HTMLImageElement && layer.getAttribute("src") !== src) {
    layer.setAttribute("src", src);
  }
}

function showRestingBall(hero: HTMLElement): void {
  hero.classList.remove("is-gated");
  hero.classList.add("is-resting");
  revealWebLayers(hero);
  if (!isHome(hero)) {
    startIdleRoll(hero);
  }
}

function revealWebLayers(hero: HTMLElement): void {
  const webPlain = hero.querySelector("[data-ha-web='plain']") as HTMLElement | null;
  if (webPlain) {
    webPlain.style.opacity = "1";
    webPlain.style.clipPath = "inset(0 0 0 0)";
  }
  const webWords = hero.querySelector("[data-ha-web='words']") as HTMLElement | null;
  if (webWords) {
    webWords.style.opacity = "1";
    webWords.style.clipPath = "inset(0 0 0 0)";
  }
}

function startIdleRoll(hero: HTMLElement): void {
  hero.classList.remove("is-idle-rolling");
  window.setTimeout(function (): void {
    if (!document.body.contains(hero)) {
      return;
    }
    if (prefersReducedMotion()) {
      return;
    }
    if (!hero.classList.contains("is-resting")) {
      return;
    }
    hero.classList.add("is-idle-rolling");
    window.setTimeout(function (): void {
      hero.classList.remove("is-idle-rolling");
    }, 3200);
  }, 1200);
}

export function jumpToDone(hero: HTMLElement): void {
  flushSleeps();
  hero.classList.remove("is-gated");
  hero.removeAttribute("data-hero-cue");
  hero.classList.add("is-resting");
  revealWebLayers(hero);
  const plain = hero.querySelector(".hero-sprite-plain") as HTMLImageElement | null;
  if (plain) {
    plain.style.transition = "";
    plain.style.opacity = "0";
  }
  const blink = hero.querySelector(".hero-sprite-blink") as HTMLImageElement | null;
  if (blink) {
    blink.style.opacity = "0";
  }
  const vanish = hero.querySelector(".hero-sprite-disappear") as HTMLImageElement | null;
  if (vanish) {
    vanish.style.opacity = "0";
  }
  const webPlain = hero.querySelector("[data-ha-web='plain']") as HTMLElement | null;
  if (webPlain) {
    webPlain.style.opacity = "1";
    webPlain.style.clipPath = "inset(0 0 0 0)";
  }
  const webWords = hero.querySelector("[data-ha-web='words']") as HTMLElement | null;
  if (webWords) {
    webWords.style.opacity = "1";
    webWords.style.clipPath = "inset(0 0 0 0)";
  }
  const boxes = [
    document.querySelector(".title-box"),
    document.querySelector(".main-box"),
    document.querySelector(".menu-box"),
  ];
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    if (box instanceof HTMLElement) {
      box.classList.remove("is-hidden");
      box.classList.remove("is-entering");
    }
  }
  const prompt = hero.querySelector(".hero-prompt");
  if (prompt instanceof HTMLElement) {
    prompt.hidden = true;
  }
  const start = hero.querySelector("[data-hero-start]");
  if (start instanceof HTMLElement) {
    start.hidden = true;
  }
  setHeroState("done");
}
