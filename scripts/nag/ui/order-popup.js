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
var _OrderPopupUI_instances, _OrderPopupUI_root, _OrderPopupUI_panel, _OrderPopupUI_meter, _OrderPopupUI_session, _OrderPopupUI_sessionTime, _OrderPopupUI_sessionCost, _OrderPopupUI_total, _OrderPopupUI_totalTime, _OrderPopupUI_totalCost, _OrderPopupUI_list, _OrderPopupUI_closeButton, _OrderPopupUI_callbacks, _OrderPopupUI_backdrop, _OrderPopupUI_wasOpen, _OrderPopupUI_syncBackdrop, _OrderPopupUI_renderMeter, _OrderPopupUI_renderTimers, _OrderPopupUI_renderList;
import { createElement, setText } from "./dom.js";
import { formatCountdown, formatSeconds, formatSignedSeconds, unitFaceLabel } from "./format.js";
import { findAppRoot } from "../mount.js";
import { createModalBackdrop } from "./modal-backdrop.js";
export class OrderPopupUI {
    constructor(root, callbacks) {
        _OrderPopupUI_instances.add(this);
        _OrderPopupUI_root.set(this, void 0);
        _OrderPopupUI_panel.set(this, void 0);
        _OrderPopupUI_meter.set(this, void 0);
        _OrderPopupUI_session.set(this, void 0);
        _OrderPopupUI_sessionTime.set(this, void 0);
        _OrderPopupUI_sessionCost.set(this, void 0);
        _OrderPopupUI_total.set(this, void 0);
        _OrderPopupUI_totalTime.set(this, void 0);
        _OrderPopupUI_totalCost.set(this, void 0);
        _OrderPopupUI_list.set(this, void 0);
        _OrderPopupUI_closeButton.set(this, void 0);
        _OrderPopupUI_callbacks.set(this, void 0);
        _OrderPopupUI_backdrop.set(this, void 0);
        _OrderPopupUI_wasOpen.set(this, false);
        __classPrivateFieldSet(this, _OrderPopupUI_root, root, "f");
        __classPrivateFieldSet(this, _OrderPopupUI_callbacks, callbacks, "f");
        __classPrivateFieldSet(this, _OrderPopupUI_panel, createElement("div", "nag-order-popup"), "f");
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").hidden = true;
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").setAttribute("role", "dialog");
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").setAttribute("aria-modal", "true");
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").setAttribute("aria-label", "The order to play");
        const title = createElement("h2", "nag-order-popup-title", "The order to play");
        __classPrivateFieldSet(this, _OrderPopupUI_meter, createElement("p", "nag-order-popup-meter"), "f");
        __classPrivateFieldSet(this, _OrderPopupUI_sessionTime, createElement("span", "nag-order-popup-timer", "0:00.0"), "f");
        __classPrivateFieldSet(this, _OrderPopupUI_sessionCost, createElement("span", "nag-order-popup-cost", "0 points"), "f");
        __classPrivateFieldSet(this, _OrderPopupUI_session, createElement("p", "nag-order-popup-session"), "f");
        __classPrivateFieldGet(this, _OrderPopupUI_session, "f").append(createElement("span", "nag-order-popup-label", "This look"), __classPrivateFieldGet(this, _OrderPopupUI_sessionTime, "f"), __classPrivateFieldGet(this, _OrderPopupUI_sessionCost, "f"));
        __classPrivateFieldSet(this, _OrderPopupUI_totalTime, createElement("span", "nag-order-popup-timer", "0:00"), "f");
        __classPrivateFieldSet(this, _OrderPopupUI_totalCost, createElement("span", "nag-order-popup-cost", "0 points"), "f");
        __classPrivateFieldSet(this, _OrderPopupUI_total, createElement("p", "nag-order-popup-total"), "f");
        __classPrivateFieldGet(this, _OrderPopupUI_total, "f").append(createElement("span", "nag-order-popup-label", "Total"), __classPrivateFieldGet(this, _OrderPopupUI_totalTime, "f"), __classPrivateFieldGet(this, _OrderPopupUI_totalCost, "f"));
        __classPrivateFieldSet(this, _OrderPopupUI_list, createElement("ol", "nag-order-popup-list"), "f");
        __classPrivateFieldGet(this, _OrderPopupUI_list, "f").setAttribute("aria-label", "Order to play");
        __classPrivateFieldSet(this, _OrderPopupUI_closeButton, createElement("button", "nag-button nag-button-primary nag-order-popup-close", "Back to the board"), "f");
        __classPrivateFieldGet(this, _OrderPopupUI_closeButton, "f").type = "button";
        __classPrivateFieldGet(this, _OrderPopupUI_closeButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _OrderPopupUI_callbacks, "f").onClose());
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").append(title, __classPrivateFieldGet(this, _OrderPopupUI_meter, "f"), __classPrivateFieldGet(this, _OrderPopupUI_session, "f"), __classPrivateFieldGet(this, _OrderPopupUI_total, "f"), __classPrivateFieldGet(this, _OrderPopupUI_list, "f"), __classPrivateFieldGet(this, _OrderPopupUI_closeButton, "f"));
        __classPrivateFieldGet(this, _OrderPopupUI_root, "f").append(__classPrivateFieldGet(this, _OrderPopupUI_panel, "f"));
        const app = findAppRoot();
        __classPrivateFieldSet(this, _OrderPopupUI_backdrop, app === null ? null : createModalBackdrop(app, __classPrivateFieldGet(this, _OrderPopupUI_panel, "f"), __classPrivateFieldGet(this, _OrderPopupUI_closeButton, "f")), "f");
    }
    render(state, deal) {
        const popup = state.popup;
        const open = popup !== null && popup.open;
        __classPrivateFieldGet(this, _OrderPopupUI_panel, "f").hidden = !open;
        if (!open) {
            __classPrivateFieldGet(this, _OrderPopupUI_list, "f").replaceChildren();
            __classPrivateFieldGet(this, _OrderPopupUI_instances, "m", _OrderPopupUI_syncBackdrop).call(this, false);
            return;
        }
        __classPrivateFieldGet(this, _OrderPopupUI_instances, "m", _OrderPopupUI_syncBackdrop).call(this, true);
        __classPrivateFieldGet(this, _OrderPopupUI_instances, "m", _OrderPopupUI_renderMeter).call(this, state);
        __classPrivateFieldGet(this, _OrderPopupUI_instances, "m", _OrderPopupUI_renderTimers).call(this, popup);
        __classPrivateFieldGet(this, _OrderPopupUI_instances, "m", _OrderPopupUI_renderList).call(this, state, deal);
    }
    /**
     * Gives the page back when the popup goes away for a reason other than the
     * engine closing it, such as a level change or a restart.
     */
    dismiss() {
        __classPrivateFieldSet(this, _OrderPopupUI_wasOpen, false, "f");
        __classPrivateFieldGet(this, _OrderPopupUI_backdrop, "f")?.close();
    }
}
_OrderPopupUI_root = new WeakMap(), _OrderPopupUI_panel = new WeakMap(), _OrderPopupUI_meter = new WeakMap(), _OrderPopupUI_session = new WeakMap(), _OrderPopupUI_sessionTime = new WeakMap(), _OrderPopupUI_sessionCost = new WeakMap(), _OrderPopupUI_total = new WeakMap(), _OrderPopupUI_totalTime = new WeakMap(), _OrderPopupUI_totalCost = new WeakMap(), _OrderPopupUI_list = new WeakMap(), _OrderPopupUI_closeButton = new WeakMap(), _OrderPopupUI_callbacks = new WeakMap(), _OrderPopupUI_backdrop = new WeakMap(), _OrderPopupUI_wasOpen = new WeakMap(), _OrderPopupUI_instances = new WeakSet(), _OrderPopupUI_syncBackdrop = function _OrderPopupUI_syncBackdrop(open) {
    if (open === __classPrivateFieldGet(this, _OrderPopupUI_wasOpen, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _OrderPopupUI_wasOpen, open, "f");
    if (open) {
        __classPrivateFieldGet(this, _OrderPopupUI_backdrop, "f")?.open();
        return;
    }
    __classPrivateFieldGet(this, _OrderPopupUI_backdrop, "f")?.close();
}, _OrderPopupUI_renderMeter = function _OrderPopupUI_renderMeter(state) {
    const popup = state.popup;
    if (popup === null) {
        return;
    }
    if (popup.free) {
        setText(__classPrivateFieldGet(this, _OrderPopupUI_meter, "f"), `Free to look for ${formatCountdown(popup.freeRemainingMs)}. Reading it again costs points.`);
        return;
    }
    const units = popup.pendingUnits;
    setText(__classPrivateFieldGet(this, _OrderPopupUI_meter, "f"), `Metered. The first second of every look is free. ${units} point${units === 1 ? "" : "s"} so far for this look.`);
}, _OrderPopupUI_renderTimers = function _OrderPopupUI_renderTimers(popup) {
    setText(__classPrivateFieldGet(this, _OrderPopupUI_sessionTime, "f"), formatSignedSeconds(popup.sessionClockMs));
    setText(__classPrivateFieldGet(this, _OrderPopupUI_sessionCost, "f"), `${popup.pendingUnits} point${popup.pendingUnits === 1 ? "" : "s"}`);
    __classPrivateFieldGet(this, _OrderPopupUI_sessionCost, "f").classList.toggle("is-negative", popup.pendingUnits > 0);
    setText(__classPrivateFieldGet(this, _OrderPopupUI_totalTime, "f"), formatSeconds(popup.viewedMs));
    setText(__classPrivateFieldGet(this, _OrderPopupUI_totalCost, "f"), `${popup.chargedPoints} point${popup.chargedPoints === 1 ? "" : "s"}`);
    __classPrivateFieldGet(this, _OrderPopupUI_totalCost, "f").classList.toggle("is-negative", popup.chargedPoints > 0);
}, _OrderPopupUI_renderList = function _OrderPopupUI_renderList(state, deal) {
    const order = state.requiredOrder.length > 0
        ? [...state.requiredOrder]
        : deal.units.map((unit) => unit.id);
    const targetIndex = state.targetUnitId === null ? -1 : order.indexOf(state.targetUnitId);
    const items = order.map((unitId, index) => {
        const item = createElement("li", "nag-order-popup-item", unitFaceLabel(deal, unitId));
        item.dataset.unitId = String(unitId);
        if (targetIndex >= 0 && index < targetIndex) {
            item.classList.add("is-done");
        }
        if (index === targetIndex) {
            item.classList.add("is-target");
        }
        return item;
    });
    __classPrivateFieldGet(this, _OrderPopupUI_list, "f").replaceChildren(...items);
};
//# sourceMappingURL=order-popup.js.map