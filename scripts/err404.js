import { prefersReducedMotion } from "./utils-dom.js";
const BOOM_MS = 4560;
const HOLD_AT = 3900;
const FADE_MS = 660;
const BUSY_WINDOW_MS = BOOM_MS + 640;
export function initErr404() {
    const stage = document.querySelector("[data-err-state]");
    if (!(stage instanceof HTMLElement)) {
        return;
    }
    ensureSplash(stage);
    const image = stage.querySelector(".err-spider");
    const poke = document.querySelector("[data-spider-poke]");
    if (!(poke instanceof HTMLButtonElement)) {
        return;
    }
    let busy = false;
    let interacted = false;
    poke.setAttribute("aria-pressed", "false");
    poke.addEventListener("click", function () {
        if (busy) {
            return;
        }
        busy = true;
        poke.setAttribute("aria-pressed", "true");
        window.setTimeout(releaseBusy, BUSY_WINDOW_MS);
        if (prefersReducedMotion()) {
            splashReduced(stage, poke, releaseBusy);
            swapCopy();
            return;
        }
        const state = readState(stage);
        if (state === "spider") {
            playBoom(stage, image instanceof HTMLImageElement ? image : null, poke, releaseBusy);
        }
        else {
            restoreSpider(stage, image instanceof HTMLImageElement ? image : null, releaseBusy);
        }
        if (!interacted) {
            interacted = true;
            swapCopy();
        }
        function releaseBusy() {
            busy = false;
        }
    });
}
function readState(stage) {
    const raw = stage.getAttribute("data-err-state") || "spider";
    if (raw === "boom" || raw === "fade" || raw === "empty") {
        return raw;
    }
    return "spider";
}
function ensureSplash(stage) {
    const found = stage.querySelector(".err-splash");
    if (found instanceof HTMLElement) {
        return;
    }
    const art = stage.querySelector(".spider-art");
    const message = stage.querySelector(".spider-message");
    const poke = stage.querySelector("[data-spider-poke]");
    if (art instanceof HTMLElement) {
        const top = document.createElement("p");
        top.className = "err-splash err-splash-top";
        top.textContent = "SPLASH!";
        top.hidden = true;
        top.setAttribute("aria-hidden", "true");
        art.appendChild(top);
        const below = document.createElement("p");
        below.className = "err-splash err-splash-art";
        below.textContent = "SPLASH!";
        below.hidden = true;
        below.setAttribute("aria-hidden", "true");
        art.appendChild(below);
    }
    if (message instanceof HTMLElement) {
        const corner = document.createElement("p");
        corner.className = "err-splash err-splash-corner";
        corner.textContent = "SPLASH!";
        corner.hidden = true;
        corner.setAttribute("aria-hidden", "true");
        message.appendChild(corner);
        if (poke instanceof HTMLElement && poke.parentElement) {
            const beside = document.createElement("span");
            beside.className = "err-splash err-splash-button";
            beside.textContent = "SPLASH!";
            beside.hidden = true;
            beside.setAttribute("aria-hidden", "true");
            poke.parentElement.insertBefore(beside, poke.nextSibling);
        }
    }
}
function setSplashVisible(stage, visible) {
    stage.querySelectorAll(".err-splash").forEach(function (node) {
        if (node instanceof HTMLElement) {
            node.hidden = !visible;
        }
    });
}
function playBoom(stage, image, poke, done) {
    stage.setAttribute("data-err-state", "boom");
    stage.classList.add("is-boom");
    setSplashVisible(stage, true);
    let boomAnimationFinished = false;
    if (image) {
        image.src = "/assets/404-boom.webp";
        image.addEventListener("animationend", function () {
            boomAnimationFinished = true;
        }, { once: true });
    }
    poke.disabled = true;
    window.setTimeout(function () {
        const showEnd = function () {
            if (image) {
                image.src = "/assets/404-boom-end.webp";
            }
            setSplashVisible(stage, false);
            stage.setAttribute("data-err-state", "fade");
            if (image) {
                image.style.transition = "opacity " + String(FADE_MS) + "ms ease";
                image.style.opacity = "0";
            }
            window.setTimeout(function () {
                stage.setAttribute("data-err-state", "empty");
                stage.classList.remove("is-boom");
                poke.disabled = false;
                poke.textContent = "Bring the spider back";
                done();
            }, FADE_MS);
        };
        if (boomAnimationFinished || !image) {
            showEnd();
            return;
        }
        image.addEventListener("animationend", showEnd, { once: true });
    }, HOLD_AT);
}
function restoreSpider(stage, image, done) {
    stage.setAttribute("data-err-state", "spider");
    stage.classList.remove("is-boom");
    setSplashVisible(stage, false);
    const poke = document.querySelector("[data-spider-poke]");
    if (image) {
        image.src = "/assets/spider-404.webp";
        image.style.transition = "opacity " + String(FADE_MS) + "ms ease";
        image.style.opacity = "0";
        window.requestAnimationFrame(function () {
            image.style.opacity = "1";
        });
    }
    if (poke instanceof HTMLButtonElement) {
        poke.textContent = "Poke the spider";
    }
    window.setTimeout(done, FADE_MS);
}
function splashReduced(stage, poke, done) {
    setSplashVisible(stage, true);
    stage.setAttribute("data-err-state", "empty");
    poke.disabled = true;
    window.setTimeout(function () {
        setSplashVisible(stage, false);
        poke.disabled = false;
        poke.textContent = "Bring the spider back";
        done();
    }, 3000);
}
function swapCopy() {
    const initial = document.querySelector("[data-error-initial]");
    const alternate = document.querySelector("[data-error-alternate]");
    if (initial instanceof HTMLElement && alternate instanceof HTMLElement) {
        initial.hidden = true;
        alternate.hidden = false;
        const heading = document.querySelector("#error-heading");
        if (heading) {
            heading.textContent = "Error 404: Ain't nuffin' here you monster!";
        }
    }
}
//# sourceMappingURL=err404.js.map