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
var _OrderStripUI_instances, _OrderStripUI_root, _OrderStripUI_title, _OrderStripUI_note, _OrderStripUI_list, _OrderStripUI_chips, _OrderStripUI_orderFor, _OrderStripUI_renderChips, _OrderStripUI_syncChips, _OrderStripUI_renderNote;
import { createElement, setText } from "./dom.js";
import { unitFaceLabel } from "./format.js";
export class OrderStripUI {
    constructor(root) {
        _OrderStripUI_instances.add(this);
        _OrderStripUI_root.set(this, void 0);
        _OrderStripUI_title.set(this, void 0);
        _OrderStripUI_note.set(this, void 0);
        _OrderStripUI_list.set(this, void 0);
        _OrderStripUI_chips.set(this, new Map());
        __classPrivateFieldSet(this, _OrderStripUI_root, root, "f");
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").classList.add("nag-order-panel");
        __classPrivateFieldSet(this, _OrderStripUI_title, createElement("h2", "nag-order-title", "Play in this order"), "f");
        __classPrivateFieldSet(this, _OrderStripUI_note, createElement("p", "nag-order-note"), "f");
        __classPrivateFieldSet(this, _OrderStripUI_list, createElement("ol", "nag-order-list"), "f");
        __classPrivateFieldGet(this, _OrderStripUI_list, "f").setAttribute("aria-label", "Order to play");
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").append(__classPrivateFieldGet(this, _OrderStripUI_title, "f"), __classPrivateFieldGet(this, _OrderStripUI_note, "f"), __classPrivateFieldGet(this, _OrderStripUI_list, "f"));
    }
    render(state, deal) {
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").hidden = false;
        const order = __classPrivateFieldGet(this, _OrderStripUI_instances, "m", _OrderStripUI_orderFor).call(this, state, deal);
        __classPrivateFieldGet(this, _OrderStripUI_instances, "m", _OrderStripUI_renderChips).call(this, state, order, deal);
        __classPrivateFieldGet(this, _OrderStripUI_instances, "m", _OrderStripUI_renderNote).call(this, state, deal);
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").dataset.state = state.anchorUnitId === null ? "scouting" : "running";
    }
    hide() {
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").hidden = true;
        __classPrivateFieldGet(this, _OrderStripUI_root, "f").dataset.state = "hidden";
    }
}
_OrderStripUI_root = new WeakMap(), _OrderStripUI_title = new WeakMap(), _OrderStripUI_note = new WeakMap(), _OrderStripUI_list = new WeakMap(), _OrderStripUI_chips = new WeakMap(), _OrderStripUI_instances = new WeakSet(), _OrderStripUI_orderFor = function _OrderStripUI_orderFor(state, deal) {
    if (state.requiredOrder.length > 0) {
        return [...state.requiredOrder];
    }
    return deal.units.map((unit) => unit.id);
}, _OrderStripUI_renderChips = function _OrderStripUI_renderChips(state, order, deal) {
    const targetIndex = state.targetUnitId === null ? -1 : order.indexOf(state.targetUnitId);
    __classPrivateFieldGet(this, _OrderStripUI_instances, "m", _OrderStripUI_syncChips).call(this, order);
    order.forEach((unitId, index) => {
        const chip = __classPrivateFieldGet(this, _OrderStripUI_chips, "f").get(unitId);
        if (chip === undefined) {
            return;
        }
        setText(chip, unitFaceLabel(deal, unitId));
        chip.classList.toggle("is-done", targetIndex >= 0 && index < targetIndex);
        chip.classList.toggle("is-target", index === targetIndex);
    });
}, _OrderStripUI_syncChips = function _OrderStripUI_syncChips(order) {
    const wanted = new Set(order);
    for (const unitId of [...__classPrivateFieldGet(this, _OrderStripUI_chips, "f").keys()]) {
        if (wanted.has(unitId)) {
            continue;
        }
        __classPrivateFieldGet(this, _OrderStripUI_chips, "f").get(unitId)?.remove();
        __classPrivateFieldGet(this, _OrderStripUI_chips, "f").delete(unitId);
    }
    const desired = [];
    for (const unitId of order) {
        let chip = __classPrivateFieldGet(this, _OrderStripUI_chips, "f").get(unitId);
        if (chip === undefined) {
            chip = createElement("li", "nag-order-chip");
            chip.dataset.unitId = String(unitId);
            __classPrivateFieldGet(this, _OrderStripUI_chips, "f").set(unitId, chip);
        }
        desired.push(chip);
    }
    const current = [...__classPrivateFieldGet(this, _OrderStripUI_list, "f").children];
    const unchanged = current.length === desired.length &&
        current.every((node, index) => node === desired[index]);
    if (unchanged) {
        return;
    }
    __classPrivateFieldGet(this, _OrderStripUI_list, "f").replaceChildren(...desired);
}, _OrderStripUI_renderNote = function _OrderStripUI_renderNote(state, deal) {
    if (state.anchorUnitId === null) {
        setText(__classPrivateFieldGet(this, _OrderStripUI_note, "f"), "Your anchor decides where this starts. Play from there and wrap around to the end.");
        return;
    }
    const anchorLabel = unitFaceLabel(deal, state.anchorUnitId);
    if (state.targetUnitId === null) {
        setText(__classPrivateFieldGet(this, _OrderStripUI_note, "f"), `Start at your anchor: ${anchorLabel}.`);
        return;
    }
    const targetLabel = unitFaceLabel(deal, state.targetUnitId);
    setText(__classPrivateFieldGet(this, _OrderStripUI_note, "f"), `Start at your anchor: ${anchorLabel}. Next up: ${targetLabel}.`);
};
//# sourceMappingURL=order-strip.js.map