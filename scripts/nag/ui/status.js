var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StatusUI_root, _StatusUI_liveRegion, _StatusUI_current;
import { createElement, setText } from "./dom.js";
import { unitFaceLabel } from "./format.js";
export class StatusUI {
    constructor(root) {
        _StatusUI_root.set(this, void 0);
        _StatusUI_liveRegion.set(this, void 0);
        _StatusUI_current.set(this, { text: "", tone: "info" });
        __classPrivateFieldSet(this, _StatusUI_root, root, "f");
        __classPrivateFieldGet(this, _StatusUI_root, "f").classList.add("nag-status");
        __classPrivateFieldSet(this, _StatusUI_liveRegion, createElement("p", "nag-status-text"), "f");
        __classPrivateFieldGet(this, _StatusUI_liveRegion, "f").setAttribute("role", "status");
        __classPrivateFieldGet(this, _StatusUI_liveRegion, "f").setAttribute("aria-live", "polite");
        __classPrivateFieldGet(this, _StatusUI_root, "f").append(__classPrivateFieldGet(this, _StatusUI_liveRegion, "f"));
    }
    show(message) {
        __classPrivateFieldSet(this, _StatusUI_current, message, "f");
        setText(__classPrivateFieldGet(this, _StatusUI_liveRegion, "f"), message.text);
        __classPrivateFieldGet(this, _StatusUI_root, "f").dataset.tone = message.tone;
    }
    clear() {
        __classPrivateFieldSet(this, _StatusUI_current, { text: "", tone: "info" }, "f");
        setText(__classPrivateFieldGet(this, _StatusUI_liveRegion, "f"), "");
        __classPrivateFieldGet(this, _StatusUI_root, "f").dataset.tone = "info";
    }
    get message() {
        return __classPrivateFieldGet(this, _StatusUI_current, "f");
    }
}
_StatusUI_root = new WeakMap(), _StatusUI_liveRegion = new WeakMap(), _StatusUI_current = new WeakMap();
export function statusForOutcome(outcome, deal, noun) {
    switch (outcome.kind) {
        case "scout-ended": {
            const label = unitFaceLabel(deal, outcome.anchorUnitId);
            return {
                text: `Scout over. ${label} is your anchor. Cards hide in 4 seconds, or turn a card now to start the run straight away.`,
                tone: "info",
            };
        }
        case "scout-cap-reset":
            return {
                text: "Scout limit reached. The board hides penalty-free and the scout starts again.",
                tone: "warning",
            };
        case "run-failed":
            if (!outcome.penalized) {
                return {
                    text: "Wrong card, but it was the first time you turned it over, so no points lost. The board hides in 4 seconds, then the run restarts at the anchor.",
                    tone: "info",
                };
            }
            return {
                text: "Wrong card. -1 point. The board hides in 4 seconds, then the run restarts at the anchor.",
                tone: "warning",
            };
        case "unit-completed":
            if (outcome.won) {
                return { text: "Perfect run. You won the level.", tone: "good" };
            }
            return {
                text: outcome.pointAwarded
                    ? `${noun} complete. +1 point.`
                    : `${noun} complete. No extra point, it was already scored.`,
                tone: "good",
            };
        case "scout-reveal":
        case "run-reveal":
        case "rejected":
            return null;
        default:
            return null;
    }
}
//# sourceMappingURL=status.js.map