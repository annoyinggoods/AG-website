import { isReloadNavigation, prefersReducedMotion, readLocalJson, writeLocalJson } from "./utils-dom.js";
const GATE_INTRO_KEY = "ag-hero-intro";
const GATE_INTRO_VERSION = 1;
const PROMPT = "Click to start";
const SPIDER_SRC = "/assets/hero/spider-plain.webp";
export function buildGate() {
    const stored = readLocalJson(GATE_INTRO_KEY);
    if (!isReloadNavigation() && stored && stored.version === GATE_INTRO_VERSION && stored.done) {
        return null;
    }
    if (prefersReducedMotion()) {
        writeLocalJson(GATE_INTRO_KEY, { version: GATE_INTRO_VERSION, done: true });
        return null;
    }
    const gate = document.createElement("div");
    gate.className = "hero-gate";
    gate.setAttribute("data-hero-gate", "");
    const spider = document.createElement("img");
    spider.className = "hero-gate-spider";
    spider.src = SPIDER_SRC;
    spider.setAttribute("alt", "");
    spider.setAttribute("aria-hidden", "true");
    const prompt = document.createElement("button");
    prompt.className = "hero-gate-prompt";
    prompt.type = "button";
    prompt.textContent = PROMPT;
    gate.appendChild(spider);
    gate.appendChild(prompt);
    document.body.appendChild(gate);
    // The prompt is the gate's only control; focusing it puts Enter and Space
    // one keystroke away for keyboard visitors without an extra tab stop.
    prompt.focus();
    const dismissed = new Promise(function (resolve) {
        let settled = false;
        function dismiss() {
            if (settled) {
                return;
            }
            settled = true;
            gate.classList.add("is-dismissed");
            writeLocalJson(GATE_INTRO_KEY, { version: GATE_INTRO_VERSION, done: true });
            resolve();
        }
        prompt.addEventListener("click", dismiss);
        gate.addEventListener("click", dismiss, { once: true });
        gate.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                dismiss();
            }
        }, { once: true });
    });
    return { element: gate, dismissed };
}
//# sourceMappingURL=hero-gate.js.map