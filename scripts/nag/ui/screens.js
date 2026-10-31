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
var _ScreensUI_instances, _ScreensUI_root, _ScreensUI_panel, _ScreensUI_title, _ScreensUI_summary, _ScreensUI_details, _ScreensUI_playAgain, _ScreensUI_nextLevel, _ScreensUI_retry, _ScreensUI_callbacks, _ScreensUI_showTitle;
import { createElement, setText } from "./dom.js";
import { formatSeconds } from "./format.js";
import { unitNoun } from "./instructions.js";
export class ScreensUI {
    constructor(root, callbacks) {
        _ScreensUI_instances.add(this);
        _ScreensUI_root.set(this, void 0);
        _ScreensUI_panel.set(this, void 0);
        _ScreensUI_title.set(this, void 0);
        _ScreensUI_summary.set(this, void 0);
        _ScreensUI_details.set(this, void 0);
        _ScreensUI_playAgain.set(this, void 0);
        _ScreensUI_nextLevel.set(this, void 0);
        _ScreensUI_retry.set(this, void 0);
        _ScreensUI_callbacks.set(this, void 0);
        __classPrivateFieldSet(this, _ScreensUI_root, root, "f");
        __classPrivateFieldSet(this, _ScreensUI_callbacks, callbacks, "f");
        __classPrivateFieldSet(this, _ScreensUI_panel, createElement("div", "nag-screen"), "f");
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").hidden = true;
        __classPrivateFieldSet(this, _ScreensUI_title, createElement("h2", "nag-screen-title"), "f");
        __classPrivateFieldSet(this, _ScreensUI_summary, createElement("p", "nag-screen-summary"), "f");
        __classPrivateFieldSet(this, _ScreensUI_details, createElement("p", "nag-screen-details"), "f");
        __classPrivateFieldSet(this, _ScreensUI_playAgain, createElement("button", "nag-button nag-button-primary", "Play again"), "f");
        __classPrivateFieldGet(this, _ScreensUI_playAgain, "f").type = "button";
        __classPrivateFieldGet(this, _ScreensUI_playAgain, "f").addEventListener("click", () => __classPrivateFieldGet(this, _ScreensUI_callbacks, "f").onPlayAgain());
        __classPrivateFieldSet(this, _ScreensUI_nextLevel, createElement("button", "nag-button nag-button-secondary", "Next level"), "f");
        __classPrivateFieldGet(this, _ScreensUI_nextLevel, "f").type = "button";
        __classPrivateFieldGet(this, _ScreensUI_nextLevel, "f").addEventListener("click", () => __classPrivateFieldGet(this, _ScreensUI_callbacks, "f").onNextLevel());
        __classPrivateFieldSet(this, _ScreensUI_retry, createElement("button", "nag-button nag-button-primary", "Try again"), "f");
        __classPrivateFieldGet(this, _ScreensUI_retry, "f").type = "button";
        __classPrivateFieldGet(this, _ScreensUI_retry, "f").addEventListener("click", () => __classPrivateFieldGet(this, _ScreensUI_callbacks, "f").onRetry());
        const actions = createElement("div", "nag-screen-actions");
        actions.append(__classPrivateFieldGet(this, _ScreensUI_playAgain, "f"), __classPrivateFieldGet(this, _ScreensUI_nextLevel, "f"), __classPrivateFieldGet(this, _ScreensUI_retry, "f"));
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").append(__classPrivateFieldGet(this, _ScreensUI_summary, "f"), __classPrivateFieldGet(this, _ScreensUI_details, "f"), actions);
        __classPrivateFieldGet(this, _ScreensUI_root, "f").append(__classPrivateFieldGet(this, _ScreensUI_panel, "f"));
    }
    showWin(state, level, hasNextLevel) {
        const noun = unitNoun(level);
        __classPrivateFieldGet(this, _ScreensUI_instances, "m", _ScreensUI_showTitle).call(this, "You win");
        setText(__classPrivateFieldGet(this, _ScreensUI_summary, "f"), `All ${state.unitCount} ${noun.toLowerCase()}s completed in one perfect run.`);
        setText(__classPrivateFieldGet(this, _ScreensUI_details, "f"), `Score ${state.score} - Time ${formatSeconds(state.elapsedMs)}`);
        __classPrivateFieldGet(this, _ScreensUI_playAgain, "f").hidden = false;
        __classPrivateFieldGet(this, _ScreensUI_nextLevel, "f").hidden = !hasNextLevel;
        __classPrivateFieldGet(this, _ScreensUI_retry, "f").hidden = true;
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").hidden = false;
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").dataset.screen = "win";
    }
    showFail(state, level) {
        const noun = unitNoun(level);
        __classPrivateFieldGet(this, _ScreensUI_instances, "m", _ScreensUI_showTitle).call(this, "Out of time");
        setText(__classPrivateFieldGet(this, _ScreensUI_summary, "f"), `The countdown ran out before you finished every ${noun.toLowerCase()}.`);
        setText(__classPrivateFieldGet(this, _ScreensUI_details, "f"), `Score ${state.score}`);
        __classPrivateFieldGet(this, _ScreensUI_playAgain, "f").hidden = true;
        __classPrivateFieldGet(this, _ScreensUI_nextLevel, "f").hidden = true;
        __classPrivateFieldGet(this, _ScreensUI_retry, "f").hidden = false;
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").hidden = false;
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").dataset.screen = "fail";
    }
    hide() {
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").hidden = true;
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").dataset.screen = "";
        __classPrivateFieldGet(this, _ScreensUI_title, "f").remove();
    }
}
_ScreensUI_root = new WeakMap(), _ScreensUI_panel = new WeakMap(), _ScreensUI_title = new WeakMap(), _ScreensUI_summary = new WeakMap(), _ScreensUI_details = new WeakMap(), _ScreensUI_playAgain = new WeakMap(), _ScreensUI_nextLevel = new WeakMap(), _ScreensUI_retry = new WeakMap(), _ScreensUI_callbacks = new WeakMap(), _ScreensUI_instances = new WeakSet(), _ScreensUI_showTitle = function _ScreensUI_showTitle(text) {
    setText(__classPrivateFieldGet(this, _ScreensUI_title, "f"), text);
    if (__classPrivateFieldGet(this, _ScreensUI_title, "f").parentElement !== __classPrivateFieldGet(this, _ScreensUI_panel, "f")) {
        __classPrivateFieldGet(this, _ScreensUI_panel, "f").prepend(__classPrivateFieldGet(this, _ScreensUI_title, "f"));
    }
};
//# sourceMappingURL=screens.js.map