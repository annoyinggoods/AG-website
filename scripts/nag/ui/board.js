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
var _BoardUI_instances, _BoardUI_root, _BoardUI_board, _BoardUI_cards, _BoardUI_engine, _BoardUI_deal, _BoardUI_revealAll, _BoardUI_unsubscribe, _BoardUI_cols, _BoardUI_rows, _BoardUI_focusIndex, _BoardUI_hadFocus, _BoardUI_restoreFocus, _BoardUI_handlePointerUp, _BoardUI_handleKeyboardClick, _BoardUI_cardFromEvent, _BoardUI_handleKeyDown, _BoardUI_nextIndexForKey, _BoardUI_handleFocusIn, _BoardUI_applyRovingTabindex, _BoardUI_flipCard, _BoardUI_createCards, _BoardUI_syncBoard, _BoardUI_isLocked;
const SKULL_BACK = "☠️";
export class BoardUI {
    constructor(root) {
        _BoardUI_instances.add(this);
        _BoardUI_root.set(this, void 0);
        _BoardUI_board.set(this, void 0);
        _BoardUI_cards.set(this, new Map());
        _BoardUI_engine.set(this, null);
        _BoardUI_deal.set(this, null);
        _BoardUI_revealAll.set(this, false);
        _BoardUI_unsubscribe.set(this, null);
        _BoardUI_cols.set(this, 1);
        _BoardUI_rows.set(this, 1);
        _BoardUI_focusIndex.set(this, 0);
        _BoardUI_hadFocus.set(this, false);
        __classPrivateFieldSet(this, _BoardUI_root, root, "f");
        __classPrivateFieldSet(this, _BoardUI_board, document.createElement("div"), "f");
        __classPrivateFieldGet(this, _BoardUI_board, "f").className = "nag-board";
        __classPrivateFieldGet(this, _BoardUI_board, "f").setAttribute("role", "group");
        __classPrivateFieldGet(this, _BoardUI_root, "f").replaceChildren(__classPrivateFieldGet(this, _BoardUI_board, "f"));
        __classPrivateFieldGet(this, _BoardUI_board, "f").addEventListener("pointerup", (event) => {
            __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_handlePointerUp).call(this, event);
        });
        __classPrivateFieldGet(this, _BoardUI_board, "f").addEventListener("click", (event) => {
            __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_handleKeyboardClick).call(this, event);
        });
        __classPrivateFieldGet(this, _BoardUI_board, "f").addEventListener("keydown", (event) => {
            __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_handleKeyDown).call(this, event);
        });
        __classPrivateFieldGet(this, _BoardUI_board, "f").addEventListener("focusin", (event) => {
            __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_handleFocusIn).call(this, event);
        });
    }
    mount(level, deal, engine) {
        __classPrivateFieldGet(this, _BoardUI_unsubscribe, "f")?.call(this);
        __classPrivateFieldSet(this, _BoardUI_unsubscribe, null, "f");
        __classPrivateFieldSet(this, _BoardUI_engine, engine, "f");
        __classPrivateFieldSet(this, _BoardUI_deal, deal, "f");
        __classPrivateFieldSet(this, _BoardUI_revealAll, false, "f");
        __classPrivateFieldGet(this, _BoardUI_cards, "f").clear();
        __classPrivateFieldSet(this, _BoardUI_focusIndex, 0, "f");
        __classPrivateFieldSet(this, _BoardUI_cols, level.cols, "f");
        __classPrivateFieldSet(this, _BoardUI_rows, level.rows, "f");
        __classPrivateFieldGet(this, _BoardUI_board, "f").style.gridTemplateColumns = `repeat(${level.cols}, minmax(0, 1fr))`;
        __classPrivateFieldGet(this, _BoardUI_board, "f").style.gridTemplateRows = `repeat(${level.rows}, minmax(0, 1fr))`;
        __classPrivateFieldGet(this, _BoardUI_board, "f").setAttribute("aria-label", `Board for level ${level.id}`);
        __classPrivateFieldGet(this, _BoardUI_board, "f").dataset.level = String(level.id);
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_createCards).call(this);
        __classPrivateFieldSet(this, _BoardUI_unsubscribe, engine.subscribe(() => __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_syncBoard).call(this)), "f");
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_syncBoard).call(this);
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_applyRovingTabindex).call(this);
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_restoreFocus).call(this);
    }
    unmount() {
        __classPrivateFieldGet(this, _BoardUI_unsubscribe, "f")?.call(this);
        __classPrivateFieldSet(this, _BoardUI_unsubscribe, null, "f");
        __classPrivateFieldSet(this, _BoardUI_engine, null, "f");
        __classPrivateFieldSet(this, _BoardUI_deal, null, "f");
        __classPrivateFieldGet(this, _BoardUI_cards, "f").clear();
        __classPrivateFieldSet(this, _BoardUI_focusIndex, 0, "f");
        __classPrivateFieldSet(this, _BoardUI_cols, 1, "f");
        __classPrivateFieldSet(this, _BoardUI_rows, 1, "f");
        // The cards are about to be removed from the document, so remember
        // whether the player was on the board and put them back afterwards.
        __classPrivateFieldSet(this, _BoardUI_hadFocus, __classPrivateFieldGet(this, _BoardUI_board, "f").contains(document.activeElement), "f");
        __classPrivateFieldGet(this, _BoardUI_board, "f").replaceChildren();
    }
    /**
     * Puts the focus on the first card, so the player can carry straight on
     * playing after the board has been rebuilt.
     */
    focusFirstCard() {
        __classPrivateFieldSet(this, _BoardUI_focusIndex, 0, "f");
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_applyRovingTabindex).call(this);
        __classPrivateFieldGet(this, _BoardUI_cards, "f").get(0)?.focus();
    }
    revealAll() {
        __classPrivateFieldSet(this, _BoardUI_revealAll, true, "f");
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_syncBoard).call(this);
    }
    render() {
        __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_syncBoard).call(this);
    }
}
_BoardUI_root = new WeakMap(), _BoardUI_board = new WeakMap(), _BoardUI_cards = new WeakMap(), _BoardUI_engine = new WeakMap(), _BoardUI_deal = new WeakMap(), _BoardUI_revealAll = new WeakMap(), _BoardUI_unsubscribe = new WeakMap(), _BoardUI_cols = new WeakMap(), _BoardUI_rows = new WeakMap(), _BoardUI_focusIndex = new WeakMap(), _BoardUI_hadFocus = new WeakMap(), _BoardUI_instances = new WeakSet(), _BoardUI_restoreFocus = function _BoardUI_restoreFocus() {
    if (!__classPrivateFieldGet(this, _BoardUI_hadFocus, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _BoardUI_hadFocus, false, "f");
    this.focusFirstCard();
}, _BoardUI_handlePointerUp = function _BoardUI_handlePointerUp(event) {
    const button = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_cardFromEvent).call(this, event);
    if (button === null) {
        return;
    }
    if (event.button !== 0) {
        return;
    }
    __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_flipCard).call(this, button);
}, _BoardUI_handleKeyboardClick = function _BoardUI_handleKeyboardClick(event) {
    if (event.detail !== 0) {
        return;
    }
    const button = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_cardFromEvent).call(this, event);
    if (button === null) {
        return;
    }
    __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_flipCard).call(this, button);
}, _BoardUI_cardFromEvent = function _BoardUI_cardFromEvent(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return null;
    }
    const button = target.closest("button.nag-card");
    return button instanceof HTMLButtonElement ? button : null;
}, _BoardUI_handleKeyDown = function _BoardUI_handleKeyDown(event) {
    const target = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_cardFromEvent).call(this, event);
    if (target === null) {
        return;
    }
    const next = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_nextIndexForKey).call(this, event.key, Number(target.dataset.cardId));
    if (next === null) {
        return;
    }
    event.preventDefault();
    __classPrivateFieldSet(this, _BoardUI_focusIndex, next, "f");
    __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_applyRovingTabindex).call(this);
    __classPrivateFieldGet(this, _BoardUI_cards, "f").get(next)?.focus();
}, _BoardUI_nextIndexForKey = function _BoardUI_nextIndexForKey(key, fromIndex) {
    const column = fromIndex % __classPrivateFieldGet(this, _BoardUI_cols, "f");
    const row = Math.floor(fromIndex / __classPrivateFieldGet(this, _BoardUI_cols, "f"));
    switch (key) {
        case "ArrowLeft":
            return column > 0 ? fromIndex - 1 : fromIndex;
        case "ArrowRight":
            return column < __classPrivateFieldGet(this, _BoardUI_cols, "f") - 1 ? fromIndex + 1 : fromIndex;
        case "ArrowUp":
            return row > 0 ? fromIndex - __classPrivateFieldGet(this, _BoardUI_cols, "f") : fromIndex;
        case "ArrowDown":
            return row < __classPrivateFieldGet(this, _BoardUI_rows, "f") - 1 ? fromIndex + __classPrivateFieldGet(this, _BoardUI_cols, "f") : fromIndex;
        case "Home":
            return row * __classPrivateFieldGet(this, _BoardUI_cols, "f");
        case "End":
            return row * __classPrivateFieldGet(this, _BoardUI_cols, "f") + (__classPrivateFieldGet(this, _BoardUI_cols, "f") - 1);
        default:
            return null;
    }
}, _BoardUI_handleFocusIn = function _BoardUI_handleFocusIn(event) {
    const target = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_cardFromEvent).call(this, event);
    if (target === null) {
        return;
    }
    const cardId = Number(target.dataset.cardId ?? "");
    if (!Number.isInteger(cardId)) {
        return;
    }
    if (cardId === __classPrivateFieldGet(this, _BoardUI_focusIndex, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _BoardUI_focusIndex, cardId, "f");
    __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_applyRovingTabindex).call(this);
}, _BoardUI_applyRovingTabindex = function _BoardUI_applyRovingTabindex() {
    for (const [cardId, button] of __classPrivateFieldGet(this, _BoardUI_cards, "f")) {
        button.tabIndex = cardId === __classPrivateFieldGet(this, _BoardUI_focusIndex, "f") ? 0 : -1;
    }
}, _BoardUI_flipCard = function _BoardUI_flipCard(button) {
    const cardId = Number(button.dataset.cardId ?? "");
    if (!Number.isInteger(cardId)) {
        return;
    }
    __classPrivateFieldGet(this, _BoardUI_engine, "f")?.flip(cardId);
}, _BoardUI_createCards = function _BoardUI_createCards() {
    const deal = __classPrivateFieldGet(this, _BoardUI_deal, "f");
    if (deal === null) {
        return;
    }
    for (const card of deal.cards) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nag-card";
        button.dataset.cardId = String(card.id);
        button.dataset.face = card.face;
        const inner = document.createElement("span");
        inner.className = "nag-card-inner";
        const back = document.createElement("span");
        back.className = "nag-card-face nag-card-back";
        back.setAttribute("aria-hidden", "true");
        back.textContent = SKULL_BACK;
        const front = document.createElement("span");
        front.className = "nag-card-face nag-card-front";
        front.setAttribute("aria-hidden", "true");
        front.textContent = card.face;
        inner.append(back, front);
        button.append(inner);
        __classPrivateFieldGet(this, _BoardUI_board, "f").append(button);
        __classPrivateFieldGet(this, _BoardUI_cards, "f").set(card.id, button);
    }
}, _BoardUI_syncBoard = function _BoardUI_syncBoard() {
    const engine = __classPrivateFieldGet(this, _BoardUI_engine, "f");
    const deal = __classPrivateFieldGet(this, _BoardUI_deal, "f");
    if (engine === null || deal === null) {
        return;
    }
    const state = engine.getState();
    const locked = __classPrivateFieldGet(this, _BoardUI_instances, "m", _BoardUI_isLocked).call(this, state);
    __classPrivateFieldGet(this, _BoardUI_board, "f").classList.toggle("is-locked", locked);
    __classPrivateFieldGet(this, _BoardUI_board, "f").classList.toggle("is-all-revealed", __classPrivateFieldGet(this, _BoardUI_revealAll, "f"));
    __classPrivateFieldGet(this, _BoardUI_board, "f").classList.toggle("is-live", state.phase === "Linger");
    for (const card of deal.cards) {
        const button = __classPrivateFieldGet(this, _BoardUI_cards, "f").get(card.id);
        if (button === undefined) {
            continue;
        }
        const revealed = __classPrivateFieldGet(this, _BoardUI_revealAll, "f") || state.revealedCardIds.includes(card.id);
        button.classList.toggle("is-revealed", revealed);
        button.classList.toggle("is-locked", locked);
        // The locked state uses aria-disabled rather than the disabled
        // attribute, because a natively disabled button drops out of the focus
        // order and the player loses their place in the grid.
        button.setAttribute("aria-disabled", locked ? "true" : "false");
        button.setAttribute("aria-pressed", revealed ? "true" : "false");
        const face = button.querySelector(".nag-card-front");
        const back = button.querySelector(".nag-card-back");
        if (face instanceof HTMLElement) {
            face.textContent = card.face;
        }
        if (back instanceof HTMLElement) {
            back.textContent = SKULL_BACK;
        }
        button.title = revealed ? `Card ${card.face}` : "Hidden card";
        // The accessible name carries the face rather than the board position,
        // because a name that omits the visible text of the card is a WCAG
        // failure. The face is hidden from sight while the card is face down,
        // so the name and the visible text stay in step.
        button.setAttribute("aria-label", revealed ? `Revealed card ${card.face}` : `Hidden card ${card.face}`);
    }
}, _BoardUI_isLocked = function _BoardUI_isLocked(state) {
    if (state.phase === "Idle" || state.phase === "Win" || state.phase === "Failed") {
        return true;
    }
    return state.popup?.open === true;
};
//# sourceMappingURL=board.js.map