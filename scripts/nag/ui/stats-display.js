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
var _StatsDisplayUI_instances, _StatsDisplayUI_root, _StatsDisplayUI_lastScore, _StatsDisplayUI_lastTime, _StatsDisplayUI_bestScore, _StatsDisplayUI_bestTime, _StatsDisplayUI_played, _StatsDisplayUI_statRow;
import { createElement, setText } from "./dom.js";
import { formatSeconds } from "./format.js";
export class StatsDisplayUI {
    constructor(root) {
        _StatsDisplayUI_instances.add(this);
        _StatsDisplayUI_root.set(this, void 0);
        _StatsDisplayUI_lastScore.set(this, void 0);
        _StatsDisplayUI_lastTime.set(this, void 0);
        _StatsDisplayUI_bestScore.set(this, void 0);
        _StatsDisplayUI_bestTime.set(this, void 0);
        _StatsDisplayUI_played.set(this, void 0);
        __classPrivateFieldSet(this, _StatsDisplayUI_root, root, "f");
        __classPrivateFieldGet(this, _StatsDisplayUI_root, "f").classList.add("nag-stats-panel");
        __classPrivateFieldSet(this, _StatsDisplayUI_lastScore, createElement("dd", "nag-stats-value nag-stats-last-score", "-"), "f");
        __classPrivateFieldSet(this, _StatsDisplayUI_lastTime, createElement("dd", "nag-stats-value nag-stats-last-time", "-"), "f");
        __classPrivateFieldSet(this, _StatsDisplayUI_bestScore, createElement("dd", "nag-stats-value nag-stats-best-score", "-"), "f");
        __classPrivateFieldSet(this, _StatsDisplayUI_bestTime, createElement("dd", "nag-stats-value nag-stats-best-time", "-"), "f");
        __classPrivateFieldSet(this, _StatsDisplayUI_played, createElement("dd", "nag-stats-value nag-stats-played", "0"), "f");
        const title = createElement("h2", "nag-stats-title", "Your record");
        const list = createElement("dl", "nag-stats-list");
        list.append(__classPrivateFieldGet(this, _StatsDisplayUI_instances, "m", _StatsDisplayUI_statRow).call(this, "Last", __classPrivateFieldGet(this, _StatsDisplayUI_lastScore, "f"), __classPrivateFieldGet(this, _StatsDisplayUI_lastTime, "f")), __classPrivateFieldGet(this, _StatsDisplayUI_instances, "m", _StatsDisplayUI_statRow).call(this, "Best", __classPrivateFieldGet(this, _StatsDisplayUI_bestScore, "f"), __classPrivateFieldGet(this, _StatsDisplayUI_bestTime, "f")), __classPrivateFieldGet(this, _StatsDisplayUI_instances, "m", _StatsDisplayUI_statRow).call(this, "Games", __classPrivateFieldGet(this, _StatsDisplayUI_played, "f")));
        __classPrivateFieldGet(this, _StatsDisplayUI_root, "f").append(title, list);
    }
    render(stats) {
        const played = stats.gamesPlayed > 0;
        setText(__classPrivateFieldGet(this, _StatsDisplayUI_lastScore, "f"), played ? String(stats.lastScore) : "-");
        setText(__classPrivateFieldGet(this, _StatsDisplayUI_lastTime, "f"), played ? formatSeconds(stats.lastTimeMs) : "-");
        setText(__classPrivateFieldGet(this, _StatsDisplayUI_bestScore, "f"), stats.bestScore === null ? "-" : String(stats.bestScore));
        setText(__classPrivateFieldGet(this, _StatsDisplayUI_bestTime, "f"), stats.bestTimeMs === null ? "-" : formatSeconds(stats.bestTimeMs));
        setText(__classPrivateFieldGet(this, _StatsDisplayUI_played, "f"), String(stats.gamesPlayed));
    }
}
_StatsDisplayUI_root = new WeakMap(), _StatsDisplayUI_lastScore = new WeakMap(), _StatsDisplayUI_lastTime = new WeakMap(), _StatsDisplayUI_bestScore = new WeakMap(), _StatsDisplayUI_bestTime = new WeakMap(), _StatsDisplayUI_played = new WeakMap(), _StatsDisplayUI_instances = new WeakSet(), _StatsDisplayUI_statRow = function _StatsDisplayUI_statRow(label, ...values) {
    const row = createElement("div", "nag-stats-row");
    row.append(createElement("dt", "nag-stats-caption", label));
    row.append(...values);
    return row;
};
//# sourceMappingURL=stats-display.js.map