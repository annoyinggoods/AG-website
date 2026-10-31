import { prefersReducedMotion } from "./utils-dom.js";
import { isMobileLayout } from "./menu-bubble.js";
const BALL_SRC = "/assets/hero/ball.webp";
const REST_SIZE = 3;
const BALL_RADIUS = 24;
const BOUNCE_COUNT = 2;
const BOUNCE_MS = 320;
const BOUNCE_LIFT = 48;
const ROLL_OFF_MS = 900;
const FALL_OFF_MS = 700;
const RETURN_PAUSE_MS = 3000;
const REAPPEAR_MS = 420;
const REAPPEAR_LIFT = 190;
const BALL_DROP_MS = 1300;
const BALL_ROLL_MS = 900;
const BALL_STAGE_PAUSE_MS = 420;
const SPIN_ROLL = 360;
const SPIN_BOUNCE = -180;
const SPIN_FALL = 540;
const ROLL_BACK_MS = 900;
const PARK_SETTLE_MS = 260;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeSettle = (t) => {
    const smooth = t * t * (3 - 2 * t);
    const curve = 0.35 + 0.65 * t;
    return smooth * curve;
};
let ball = null;
let interactionRunning = false;
let parked = false;
export function initHeroBall() {
    if (ball) {
        return;
    }
    const existing = document.querySelector(".logo-ball");
    if (existing instanceof HTMLImageElement) {
        ball = existing;
    }
    else {
        const created = document.createElement("img");
        created.className = "logo-ball";
        created.src = BALL_SRC;
        created.alt = "";
        created.decoding = "async";
        document.body.appendChild(created);
        ball = created;
    }
    ball.setAttribute("role", "button");
    ball.setAttribute("tabindex", "0");
    ball.setAttribute("aria-label", "Annoying Goods logo ball. Activate to play with the spider.");
    ball.setAttribute("aria-describedby", "ball-status-desc");
    ball.addEventListener("click", function () {
        void runBallInteraction();
    });
    ball.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }
        event.preventDefault();
        void runBallInteraction();
    });
    window.addEventListener("scroll", reparkIfParked, { passive: true });
    window.addEventListener("resize", reparkIfParked);
}
// The interaction is a one-shot animation with no persistent state, so a
// polite live region carries the start and the return of the choreography.
let ballStatus = null;
function announceBall(text) {
    if (!ballStatus || !document.body.contains(ballStatus)) {
        ballStatus = document.querySelector("[data-ball-status]");
    }
    if (!ballStatus) {
        ballStatus = document.createElement("span");
        ballStatus.id = "ball-status-desc";
        ballStatus.setAttribute("data-ball-status", "");
        ballStatus.setAttribute("role", "status");
        ballStatus.setAttribute("aria-live", "polite");
        ballStatus.className = "hero-sr-only";
        document.body.appendChild(ballStatus);
    }
    ballStatus.textContent = text;
}
export function isBallParked() {
    return parked;
}
function reparkIfParked() {
    if (!ball || !parked || interactionRunning) {
        return;
    }
    const spot = restSpot();
    ball.style.setProperty("--x", String(spot[0]) + "px");
    ball.style.setProperty("--y", String(spot[1]) + "px");
}
export async function parkBallInMenu() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target) {
        return;
    }
    await delay(PARK_SETTLE_MS);
    const spot = restSpot();
    target.classList.remove("is-choreo");
    target.classList.add("is-parked");
    target.style.pointerEvents = "";
    target.style.opacity = "1";
    target.style.setProperty("--x", String(spot[0]) + "px");
    target.style.setProperty("--y", String(spot[1]) + "px");
    parked = true;
}
export async function runBallChoreo() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target) {
        return;
    }
    target.classList.add("is-choreo");
    target.classList.remove("is-parked");
    target.style.pointerEvents = "none";
    target.style.opacity = "1";
    const start = heroTopRightSpot();
    const title = titleSpot();
    const main = mainSpot();
    const rest = restSpot();
    target.style.setProperty("--x", String(start[0]) + "px");
    target.style.setProperty("--y", String(start[1]) + "px");
    await delay(120);
    const stages = [title, main, rest];
    let current = start;
    for (let i = 0; i < stages.length; i += 1) {
        const stage = stages[i];
        if (!stage) {
            continue;
        }
        const rolled = [stage[0], current[1]];
        await playSegment(target, { from: current, to: rolled, duration: BALL_ROLL_MS, ease: easeInOut, spin: SPIN_ROLL });
        await playDrop(target, rolled, stage, BALL_DROP_MS);
        current = stage;
        await delay(BALL_STAGE_PAUSE_MS);
    }
    target.classList.remove("is-choreo");
    target.classList.add("is-parked");
    target.style.pointerEvents = "";
    parked = true;
}
export async function runBallInteraction() {
    if (!ball) {
        initHeroBall();
    }
    const target = ball;
    if (!target || interactionRunning) {
        return;
    }
    interactionRunning = true;
    try {
        if (prefersReducedMotion()) {
            announceBall("The logo ball stays put because reduced motion is on.");
            await parkBallInMenu();
            return;
        }
        announceBall("The logo ball bounces, rolls off the edge and falls.");
        const spot = restSpot();
        const edge = restEdgeSpot();
        target.classList.add("is-choreo");
        target.classList.remove("is-parked");
        target.style.pointerEvents = "none";
        for (let bounce = 0; bounce < BOUNCE_COUNT; bounce += 1) {
            const lifted = [spot[0], spot[1] - BOUNCE_LIFT];
            await playSegment(target, { from: spot, to: lifted, duration: BOUNCE_MS, ease: easeOut, spin: SPIN_BOUNCE });
            await playSegment(target, { from: lifted, to: spot, duration: BOUNCE_MS, ease: easeIn, spin: 0 });
        }
        const offEdge = [edge[0], spot[1]];
        await playSegment(target, { from: spot, to: offEdge, duration: ROLL_OFF_MS, ease: easeInOut, spin: SPIN_ROLL * 2 });
        const offBottom = [edge[0], window.innerHeight + 120];
        await playSegment(target, { from: offEdge, to: offBottom, duration: FALL_OFF_MS, ease: easeIn, spin: SPIN_FALL });
        target.style.opacity = "0";
        await delay(RETURN_PAUSE_MS);
        const reappear = [edge[0], spot[1] - REAPPEAR_LIFT];
        target.style.opacity = "1";
        target.style.setProperty("--x", String(reappear[0]) + "px");
        target.style.setProperty("--y", String(reappear[1]) + "px");
        await delay(REAPPEAR_MS);
        const land = [edge[0], spot[1]];
        await playDrop(target, reappear, land, BALL_DROP_MS);
        await playSegment(target, { from: land, to: spot, duration: ROLL_BACK_MS, ease: easeInOut, spin: SPIN_ROLL });
        target.classList.remove("is-choreo");
        target.classList.add("is-parked");
        target.style.pointerEvents = "";
        parked = true;
        announceBall("The logo ball is back on the menu.");
    }
    finally {
        interactionRunning = false;
    }
}
async function playDrop(target, from, to, duration) {
    await playSegment(target, { from: from, to: to, duration: duration * 0.78, ease: easeIn, spin: SPIN_FALL });
    const lifted = [to[0], to[1] - BOUNCE_LIFT * 0.45];
    await playSegment(target, { from: to, to: lifted, duration: duration * 0.14, ease: easeOut, spin: SPIN_BOUNCE });
    await playSegment(target, { from: lifted, to: to, duration: duration * 0.08, ease: easeIn, spin: 0 });
}
async function playSegment(target, segment) {
    const start = performance.now();
    return new Promise(function (resolve) {
        function frame(now) {
            const t = Math.min(Math.max(0, now - start) / segment.duration, 1);
            const eased = segment.ease(t);
            const spin = segment.spin * eased;
            const x = segment.from[0] + (segment.to[0] - segment.from[0]) * eased;
            const y = segment.from[1] + (segment.to[1] - segment.from[1]) * eased;
            target.style.setProperty("--x", String(x) + "px");
            target.style.setProperty("--y", String(y) + "px");
            target.style.setProperty("--ball-spin", String(spin) + "deg");
            if (t >= 1) {
                resolve();
                return;
            }
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    });
}
function restSurface() {
    const selector = isMobileLayout() ? ".title-box" : ".menu-box";
    const surface = document.querySelector(selector);
    if (surface instanceof HTMLElement) {
        const rect = surface.getBoundingClientRect();
        if (rect.width > 0) {
            return surface;
        }
    }
    return null;
}
function ballRadius() {
    if (ball) {
        const size = ball.offsetWidth || 0;
        if (size > 0) {
            return size / 2;
        }
    }
    return BALL_RADIUS;
}
function restSpot() {
    const surface = restSurface();
    if (surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.min(Math.max(rect.left + rect.width / 2, 24), window.innerWidth - 24);
        const y = rect.top - ballRadius();
        return [x, y];
    }
    return [window.innerWidth / 2, window.innerHeight - 60];
}
function restEdgeSpot() {
    const surface = restSurface();
    if (surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.max(rect.left + ballRadius(), 16);
        return [x, rect.top - ballRadius()];
    }
    return [24, window.innerHeight - 60];
}
function titleSpot() {
    const title = document.querySelector(".title-box");
    if (title instanceof HTMLElement) {
        const rect = title.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width / 2, rect.top];
        }
    }
    return [window.innerWidth / 2, 80];
}
function mainSpot() {
    const main = document.querySelector(".main-box");
    if (main instanceof HTMLElement) {
        const rect = main.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width / 2, rect.top];
        }
    }
    return [window.innerWidth / 2, 160];
}
function heroTopRightSpot() {
    const hero = document.querySelector("[data-hero-strip]");
    if (hero instanceof HTMLElement) {
        const rect = hero.getBoundingClientRect();
        if (rect.width > 0) {
            return [rect.left + rect.width * 0.9, rect.top + rect.height * 0.14];
        }
    }
    return [window.innerWidth * 0.9, 80];
}
function delay(ms) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, ms);
    });
}
//# sourceMappingURL=hero-ball.js.map