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
var _HistoryUI_instances, _HistoryUI_root, _HistoryUI_body, _HistoryUI_empty, _HistoryUI_clearButton, _HistoryUI_rowFor;
import { createElement } from "./dom.js";
import { formatSeconds } from "./format.js";
export class HistoryUI {
    constructor(root, onClear) {
        _HistoryUI_instances.add(this);
        _HistoryUI_root.set(this, void 0);
        _HistoryUI_body.set(this, void 0);
        _HistoryUI_empty.set(this, void 0);
        _HistoryUI_clearButton.set(this, void 0);
        __classPrivateFieldSet(this, _HistoryUI_root, root, "f");
        __classPrivateFieldGet(this, _HistoryUI_root, "f").classList.add("nag-history-panel");
        const title = createElement("h2", "nag-history-title", "Previous games");
        __classPrivateFieldSet(this, _HistoryUI_clearButton, createElement("button", "nag-button nag-button-quiet", "Clear history"), "f");
        __classPrivateFieldGet(this, _HistoryUI_clearButton, "f").type = "button";
        __classPrivateFieldGet(this, _HistoryUI_clearButton, "f").addEventListener("click", () => onClear());
        const header = createElement("div", "nag-history-header");
        header.append(title, __classPrivateFieldGet(this, _HistoryUI_clearButton, "f"));
        const table = createElement("table", "nag-history-table");
        const thead = createElement("thead");
        const headRow = createElement("tr");
        for (const label of ["Level", "Time", "Score", "Date played", "Progress"]) {
            const cell = createElement("th", "nag-history-th", label);
            cell.scope = "col";
            headRow.append(cell);
        }
        thead.append(headRow);
        __classPrivateFieldSet(this, _HistoryUI_body, createElement("tbody", "nag-history-body"), "f");
        __classPrivateFieldSet(this, _HistoryUI_empty, createElement("p", "nag-history-empty", "No games played yet."), "f");
        table.append(thead, __classPrivateFieldGet(this, _HistoryUI_body, "f"));
        const scroll = createElement("div", "nag-history-scroll");
        // The table is wider than a phone, so the region scrolls sideways. A
        // scrolling region has to be reachable with the keyboard, or a keyboard
        // player cannot reach the columns that do not fit.
        scroll.tabIndex = 0;
        scroll.setAttribute("role", "region");
        scroll.setAttribute("aria-label", "Previous games, scrolls sideways");
        scroll.append(table);
        __classPrivateFieldGet(this, _HistoryUI_root, "f").append(header, scroll, __classPrivateFieldGet(this, _HistoryUI_empty, "f"));
    }
    render(entries) {
        if (entries.length === 0) {
            __classPrivateFieldGet(this, _HistoryUI_body, "f").replaceChildren();
            __classPrivateFieldGet(this, _HistoryUI_empty, "f").hidden = false;
            __classPrivateFieldGet(this, _HistoryUI_clearButton, "f").hidden = true;
            return;
        }
        __classPrivateFieldGet(this, _HistoryUI_empty, "f").hidden = true;
        __classPrivateFieldGet(this, _HistoryUI_clearButton, "f").hidden = false;
        const rows = entries.map((entry) => __classPrivateFieldGet(this, _HistoryUI_instances, "m", _HistoryUI_rowFor).call(this, entry));
        __classPrivateFieldGet(this, _HistoryUI_body, "f").replaceChildren(...rows);
    }
}
_HistoryUI_root = new WeakMap(), _HistoryUI_body = new WeakMap(), _HistoryUI_empty = new WeakMap(), _HistoryUI_clearButton = new WeakMap(), _HistoryUI_instances = new WeakSet(), _HistoryUI_rowFor = function _HistoryUI_rowFor(entry) {
    const row = createElement("tr", "nag-history-row");
    row.dataset.levelId = String(entry.levelId);
    row.dataset.won = String(entry.won);
    const level = createElement("td", "nag-history-td", `Level ${entry.levelId}`);
    const time = createElement("td", "nag-history-td nag-history-time", formatSeconds(entry.timeMs));
    const score = createElement("td", "nag-history-td nag-history-score", String(entry.score));
    const date = createElement("td", "nag-history-td", formatDate(entry.playedAtMs));
    const progress = createElement("td", "nag-history-td nag-history-progress", `${entry.progress}/${entry.unitCount}${entry.won ? " won" : ""}`);
    if (!entry.won) {
        score.classList.add("is-negative");
    }
    row.append(level, time, score, date, progress);
    return row;
};
export function formatDate(timestampMs) {
    const date = new Date(timestampMs);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}
//# sourceMappingURL=history.js.map