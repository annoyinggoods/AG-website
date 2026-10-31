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
var _GameEngine_instances, _GameEngine_level, _GameEngine_deal, _GameEngine_clock, _GameEngine_score, _GameEngine_listeners, _GameEngine_phase, _GameEngine_revealed, _GameEngine_seen, _GameEngine_anchor, _GameEngine_order, _GameEngine_targetIndex, _GameEngine_targetProgress, _GameEngine_scoutAnchorCandidate, _GameEngine_linger, _GameEngine_startedAtMs, _GameEngine_stoppedAtMs, _GameEngine_failedAtMs, _GameEngine_popupOpen, _GameEngine_popupIsFree, _GameEngine_popupOpenedAtMs, _GameEngine_freePopupSpent, _GameEngine_meteredViewMs, _GameEngine_totalViewMs, _GameEngine_emit, _GameEngine_finishFlip, _GameEngine_rejectionFor, _GameEngine_isLingerTarget, _GameEngine_flipDuringScout, _GameEngine_scoutEndUnitFor, _GameEngine_endScout, _GameEngine_flipDuringRun, _GameEngine_penalizesWrongFlip, _GameEngine_unseenCardCount, _GameEngine_beginLinger, _GameEngine_hideCardsNow, _GameEngine_flipDuringLinger, _GameEngine_resolveTime, _GameEngine_resolveLinger, _GameEngine_resolveCountdown, _GameEngine_resolvePopup, _GameEngine_closePopup, _GameEngine_popupState;
import { requiredOrder } from "./order.js";
import { Score } from "./scoring.js";
import { commencedUnits, countPassedMarks, countdownRemainingMs, elapsedMs, freePopupRemainingMs, } from "./timer-model.js";
export const LINGER_MS = 4000;
const LAST_DEDUCIBLE_CARD_COUNT = 2;
export class GameEngine {
    constructor(level, deal, clock) {
        _GameEngine_instances.add(this);
        _GameEngine_level.set(this, void 0);
        _GameEngine_deal.set(this, void 0);
        _GameEngine_clock.set(this, void 0);
        _GameEngine_score.set(this, new Score());
        _GameEngine_listeners.set(this, new Set());
        _GameEngine_phase.set(this, "Idle");
        _GameEngine_revealed.set(this, new Set());
        _GameEngine_seen.set(this, new Set());
        _GameEngine_anchor.set(this, null);
        _GameEngine_order.set(this, []);
        _GameEngine_targetIndex.set(this, 0);
        _GameEngine_targetProgress.set(this, []);
        _GameEngine_scoutAnchorCandidate.set(this, null);
        _GameEngine_linger.set(this, null);
        _GameEngine_startedAtMs.set(this, null);
        _GameEngine_stoppedAtMs.set(this, null);
        _GameEngine_failedAtMs.set(this, null);
        _GameEngine_popupOpen.set(this, false);
        _GameEngine_popupIsFree.set(this, false);
        _GameEngine_popupOpenedAtMs.set(this, 0);
        _GameEngine_freePopupSpent.set(this, false);
        _GameEngine_meteredViewMs.set(this, 0);
        _GameEngine_totalViewMs.set(this, 0);
        __classPrivateFieldSet(this, _GameEngine_level, level, "f");
        __classPrivateFieldSet(this, _GameEngine_deal, deal, "f");
        __classPrivateFieldSet(this, _GameEngine_clock, clock, "f");
    }
    subscribe(listener) {
        __classPrivateFieldGet(this, _GameEngine_listeners, "f").add(listener);
        return () => {
            __classPrivateFieldGet(this, _GameEngine_listeners, "f").delete(listener);
        };
    }
    start() {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
        if (__classPrivateFieldGet(this, _GameEngine_phase, "f") !== "Idle") {
            return;
        }
        const now = __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this);
        __classPrivateFieldSet(this, _GameEngine_startedAtMs, now, "f");
        __classPrivateFieldSet(this, _GameEngine_phase, "Scout", "f");
        const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup;
        if (rule !== null && rule.kind === "metered") {
            __classPrivateFieldSet(this, _GameEngine_popupOpen, true, "f");
            __classPrivateFieldSet(this, _GameEngine_popupIsFree, true, "f");
            __classPrivateFieldSet(this, _GameEngine_popupOpenedAtMs, now, "f");
        }
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "started" });
    }
    flip(cardId) {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
        const rejection = __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_rejectionFor).call(this, cardId);
        if (rejection !== null) {
            return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_finishFlip).call(this, { kind: "rejected", reason: rejection });
        }
        if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Linger") {
            return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_finishFlip).call(this, __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_flipDuringLinger).call(this, cardId));
        }
        if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Scout") {
            return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_finishFlip).call(this, __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_flipDuringScout).call(this, cardId));
        }
        return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_finishFlip).call(this, __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_flipDuringRun).call(this, cardId));
    }
    tick() {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
    }
    openOrderPopup() {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
        if (__classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup === null) {
            return false;
        }
        if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Idle" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Win" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Failed") {
            return false;
        }
        if (__classPrivateFieldGet(this, _GameEngine_popupOpen, "f")) {
            return false;
        }
        const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup;
        if (rule === null) {
            return false;
        }
        if (rule.kind === "free") {
            __classPrivateFieldSet(this, _GameEngine_popupOpen, true, "f");
            __classPrivateFieldSet(this, _GameEngine_popupIsFree, true, "f");
            __classPrivateFieldSet(this, _GameEngine_popupOpenedAtMs, __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this), "f");
            __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "popup-opened", free: true });
            return true;
        }
        __classPrivateFieldSet(this, _GameEngine_popupOpen, true, "f");
        __classPrivateFieldSet(this, _GameEngine_popupIsFree, !__classPrivateFieldGet(this, _GameEngine_freePopupSpent, "f"), "f");
        __classPrivateFieldSet(this, _GameEngine_popupOpenedAtMs, __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this), "f");
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "popup-opened", free: __classPrivateFieldGet(this, _GameEngine_popupIsFree, "f") });
        return true;
    }
    closeOrderPopup() {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
        if (!__classPrivateFieldGet(this, _GameEngine_popupOpen, "f")) {
            return 0;
        }
        return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_closePopup).call(this, __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this));
    }
    getState() {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveTime).call(this);
        const now = __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this);
        const startedAt = __classPrivateFieldGet(this, _GameEngine_startedAtMs, "f");
        const timeRule = __classPrivateFieldGet(this, _GameEngine_level, "f").timeRule;
        const elapsed = startedAt !== null ? elapsedMs(startedAt, now, __classPrivateFieldGet(this, _GameEngine_stoppedAtMs, "f")) : 0;
        const countdownRemaining = timeRule.kind === "countdown" && startedAt !== null
            ? countdownRemainingMs(startedAt, timeRule.totalMs, now)
            : null;
        return {
            levelId: __classPrivateFieldGet(this, _GameEngine_level, "f").id,
            phase: __classPrivateFieldGet(this, _GameEngine_phase, "f"),
            score: __classPrivateFieldGet(this, _GameEngine_score, "f").value,
            revealedCardIds: [...__classPrivateFieldGet(this, _GameEngine_revealed, "f")],
            seenCardIds: [...__classPrivateFieldGet(this, _GameEngine_seen, "f")],
            anchorUnitId: __classPrivateFieldGet(this, _GameEngine_anchor, "f"),
            requiredOrder: [...__classPrivateFieldGet(this, _GameEngine_order, "f")],
            targetUnitId: __classPrivateFieldGet(this, _GameEngine_order, "f").length > 0 ? __classPrivateFieldGet(this, _GameEngine_order, "f")[__classPrivateFieldGet(this, _GameEngine_targetIndex, "f")] : null,
            completedUnitIds: __classPrivateFieldGet(this, _GameEngine_score, "f").completedUnitIds,
            unitCount: __classPrivateFieldGet(this, _GameEngine_deal, "f").units.length,
            lingerHideAfterMs: __classPrivateFieldGet(this, _GameEngine_linger, "f") !== null ? __classPrivateFieldGet(this, _GameEngine_linger, "f").hideAfterMs : null,
            startedAtMs: __classPrivateFieldGet(this, _GameEngine_startedAtMs, "f"),
            stoppedAtMs: __classPrivateFieldGet(this, _GameEngine_stoppedAtMs, "f"),
            failedAtMs: __classPrivateFieldGet(this, _GameEngine_failedAtMs, "f"),
            elapsedMs: elapsed,
            countdownRemainingMs: countdownRemaining,
            popup: __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_popupState).call(this, now),
        };
    }
}
_GameEngine_level = new WeakMap(), _GameEngine_deal = new WeakMap(), _GameEngine_clock = new WeakMap(), _GameEngine_score = new WeakMap(), _GameEngine_listeners = new WeakMap(), _GameEngine_phase = new WeakMap(), _GameEngine_revealed = new WeakMap(), _GameEngine_seen = new WeakMap(), _GameEngine_anchor = new WeakMap(), _GameEngine_order = new WeakMap(), _GameEngine_targetIndex = new WeakMap(), _GameEngine_targetProgress = new WeakMap(), _GameEngine_scoutAnchorCandidate = new WeakMap(), _GameEngine_linger = new WeakMap(), _GameEngine_startedAtMs = new WeakMap(), _GameEngine_stoppedAtMs = new WeakMap(), _GameEngine_failedAtMs = new WeakMap(), _GameEngine_popupOpen = new WeakMap(), _GameEngine_popupIsFree = new WeakMap(), _GameEngine_popupOpenedAtMs = new WeakMap(), _GameEngine_freePopupSpent = new WeakMap(), _GameEngine_meteredViewMs = new WeakMap(), _GameEngine_totalViewMs = new WeakMap(), _GameEngine_instances = new WeakSet(), _GameEngine_emit = function _GameEngine_emit(event) {
    __classPrivateFieldGet(this, _GameEngine_listeners, "f").forEach((listener) => listener(event));
}, _GameEngine_finishFlip = function _GameEngine_finishFlip(outcome) {
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "flip", outcome });
    return outcome;
}, _GameEngine_rejectionFor = function _GameEngine_rejectionFor(cardId) {
    if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Idle") {
        return "not-started";
    }
    if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Win" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Failed") {
        return "game-over";
    }
    if (__classPrivateFieldGet(this, _GameEngine_popupOpen, "f")) {
        return "popup-open";
    }
    if (cardId < 0 || cardId >= __classPrivateFieldGet(this, _GameEngine_deal, "f").cards.length) {
        return "unknown-card";
    }
    if (__classPrivateFieldGet(this, _GameEngine_revealed, "f").has(cardId) && !__classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_isLingerTarget).call(this, cardId)) {
        return "already-revealed";
    }
    return null;
}, _GameEngine_isLingerTarget = function _GameEngine_isLingerTarget(cardId) {
    if (__classPrivateFieldGet(this, _GameEngine_phase, "f") !== "Linger") {
        return false;
    }
    const linger = __classPrivateFieldGet(this, _GameEngine_linger, "f");
    if (linger === null || linger.resume !== "run") {
        return false;
    }
    const targetUnitId = __classPrivateFieldGet(this, _GameEngine_order, "f")[__classPrivateFieldGet(this, _GameEngine_targetIndex, "f")];
    if (targetUnitId === undefined) {
        return false;
    }
    return __classPrivateFieldGet(this, _GameEngine_deal, "f").units[targetUnitId].cardIds.includes(cardId);
}, _GameEngine_flipDuringScout = function _GameEngine_flipDuringScout(cardId) {
    const unitId = __classPrivateFieldGet(this, _GameEngine_deal, "f").cards[cardId].unitId;
    __classPrivateFieldGet(this, _GameEngine_revealed, "f").add(cardId);
    __classPrivateFieldGet(this, _GameEngine_seen, "f").add(cardId);
    if (__classPrivateFieldGet(this, _GameEngine_scoutAnchorCandidate, "f") === null) {
        __classPrivateFieldSet(this, _GameEngine_scoutAnchorCandidate, unitId, "f");
    }
    const endedUnit = __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_scoutEndUnitFor).call(this, unitId);
    if (endedUnit !== null) {
        return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_endScout).call(this, endedUnit, cardId);
    }
    if (__classPrivateFieldGet(this, _GameEngine_revealed, "f").size >= __classPrivateFieldGet(this, _GameEngine_level, "f").scoutCap) {
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_beginLinger).call(this, "scout");
        __classPrivateFieldSet(this, _GameEngine_scoutAnchorCandidate, null, "f");
        return { kind: "scout-cap-reset", cardId };
    }
    return { kind: "scout-reveal", cardId };
}, _GameEngine_scoutEndUnitFor = function _GameEngine_scoutEndUnitFor(unitId) {
    if (__classPrivateFieldGet(this, _GameEngine_level, "f").scoutEnd === "pair") {
        const candidate = __classPrivateFieldGet(this, _GameEngine_scoutAnchorCandidate, "f");
        if (candidate === null) {
            return null;
        }
        const unit = __classPrivateFieldGet(this, _GameEngine_deal, "f").units[unitId];
        const complete = unit.cardIds.every((id) => __classPrivateFieldGet(this, _GameEngine_revealed, "f").has(id));
        return unitId === candidate && complete ? candidate : null;
    }
    const candidate = __classPrivateFieldGet(this, _GameEngine_scoutAnchorCandidate, "f");
    if (candidate === null) {
        return null;
    }
    const successor = (candidate + 1) % __classPrivateFieldGet(this, _GameEngine_deal, "f").units.length;
    return unitId === successor ? candidate : null;
}, _GameEngine_endScout = function _GameEngine_endScout(anchorUnitId, cardId) {
    __classPrivateFieldSet(this, _GameEngine_anchor, anchorUnitId, "f");
    __classPrivateFieldSet(this, _GameEngine_order, requiredOrder(__classPrivateFieldGet(this, _GameEngine_deal, "f").units.length, anchorUnitId), "f");
    const pointAwarded = __classPrivateFieldGet(this, _GameEngine_score, "f").awardUnit(anchorUnitId);
    __classPrivateFieldSet(this, _GameEngine_targetIndex, 0, "f");
    __classPrivateFieldSet(this, _GameEngine_targetProgress, [], "f");
    __classPrivateFieldSet(this, _GameEngine_scoutAnchorCandidate, null, "f");
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_beginLinger).call(this, "run");
    return { kind: "scout-ended", cardId, anchorUnitId, pointAwarded };
}, _GameEngine_flipDuringRun = function _GameEngine_flipDuringRun(cardId) {
    const unitId = __classPrivateFieldGet(this, _GameEngine_deal, "f").cards[cardId].unitId;
    const targetUnitId = __classPrivateFieldGet(this, _GameEngine_order, "f")[__classPrivateFieldGet(this, _GameEngine_targetIndex, "f")];
    if (unitId !== targetUnitId) {
        const penalized = __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_penalizesWrongFlip).call(this, cardId);
        __classPrivateFieldGet(this, _GameEngine_revealed, "f").add(cardId);
        __classPrivateFieldGet(this, _GameEngine_seen, "f").add(cardId);
        if (penalized) {
            __classPrivateFieldGet(this, _GameEngine_score, "f").penalizeWrongFlip();
        }
        __classPrivateFieldSet(this, _GameEngine_targetIndex, 0, "f");
        __classPrivateFieldSet(this, _GameEngine_targetProgress, [], "f");
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_beginLinger).call(this, "run");
        return { kind: "run-failed", cardId, penalized };
    }
    __classPrivateFieldGet(this, _GameEngine_revealed, "f").add(cardId);
    __classPrivateFieldGet(this, _GameEngine_seen, "f").add(cardId);
    __classPrivateFieldGet(this, _GameEngine_targetProgress, "f").push(cardId);
    const unit = __classPrivateFieldGet(this, _GameEngine_deal, "f").units[targetUnitId];
    if (__classPrivateFieldGet(this, _GameEngine_targetProgress, "f").length < unit.cardIds.length) {
        return { kind: "run-reveal", cardId };
    }
    const pointAwarded = __classPrivateFieldGet(this, _GameEngine_score, "f").awardUnit(targetUnitId);
    const won = __classPrivateFieldGet(this, _GameEngine_targetIndex, "f") === __classPrivateFieldGet(this, _GameEngine_order, "f").length - 1;
    if (won) {
        __classPrivateFieldSet(this, _GameEngine_phase, "Win", "f");
        __classPrivateFieldSet(this, _GameEngine_stoppedAtMs, __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this), "f");
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "won" });
    }
    else {
        __classPrivateFieldSet(this, _GameEngine_targetIndex, __classPrivateFieldGet(this, _GameEngine_targetIndex, "f") + 1, "f");
        __classPrivateFieldSet(this, _GameEngine_targetProgress, [], "f");
    }
    return { kind: "unit-completed", cardId, unitId: targetUnitId, pointAwarded, won };
}, _GameEngine_penalizesWrongFlip = function _GameEngine_penalizesWrongFlip(cardId) {
    if (!__classPrivateFieldGet(this, _GameEngine_seen, "f").has(cardId)) {
        return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_unseenCardCount).call(this) <= LAST_DEDUCIBLE_CARD_COUNT;
    }
    return true;
}, _GameEngine_unseenCardCount = function _GameEngine_unseenCardCount() {
    return __classPrivateFieldGet(this, _GameEngine_deal, "f").cards.length - __classPrivateFieldGet(this, _GameEngine_seen, "f").size;
}, _GameEngine_beginLinger = function _GameEngine_beginLinger(resume) {
    __classPrivateFieldSet(this, _GameEngine_linger, { hideAfterMs: __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this) + LINGER_MS, resume }, "f");
    __classPrivateFieldSet(this, _GameEngine_phase, "Linger", "f");
}, _GameEngine_hideCardsNow = function _GameEngine_hideCardsNow() {
    const linger = __classPrivateFieldGet(this, _GameEngine_linger, "f");
    if (linger === null) {
        return;
    }
    __classPrivateFieldSet(this, _GameEngine_linger, null, "f");
    __classPrivateFieldGet(this, _GameEngine_revealed, "f").clear();
    // A finished attempt stays finished, so the hide must not bring the
    // phase back to Scout or Run.
    if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Win" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Failed") {
        return;
    }
    __classPrivateFieldSet(this, _GameEngine_phase, linger.resume === "scout" ? "Scout" : "Run", "f");
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "cards-hidden", resumedPhase: __classPrivateFieldGet(this, _GameEngine_phase, "f") });
}, _GameEngine_flipDuringLinger = function _GameEngine_flipDuringLinger(cardId) {
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_hideCardsNow).call(this);
    if (__classPrivateFieldGet(this, _GameEngine_phase, "f") === "Scout") {
        return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_flipDuringScout).call(this, cardId);
    }
    return __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_flipDuringRun).call(this, cardId);
}, _GameEngine_resolveTime = function _GameEngine_resolveTime() {
    const now = __classPrivateFieldGet(this, _GameEngine_clock, "f").call(this);
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveLinger).call(this, now);
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolveCountdown).call(this, now);
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_resolvePopup).call(this, now);
}, _GameEngine_resolveLinger = function _GameEngine_resolveLinger(now) {
    const linger = __classPrivateFieldGet(this, _GameEngine_linger, "f");
    if (linger === null || now < linger.hideAfterMs) {
        return;
    }
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_hideCardsNow).call(this);
}, _GameEngine_resolveCountdown = function _GameEngine_resolveCountdown(now) {
    const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").timeRule;
    if (rule.kind !== "countdown") {
        return;
    }
    const startedAt = __classPrivateFieldGet(this, _GameEngine_startedAtMs, "f");
    if (startedAt === null) {
        return;
    }
    const active = __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Scout" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Linger" || __classPrivateFieldGet(this, _GameEngine_phase, "f") === "Run";
    if (!active) {
        return;
    }
    const remaining = countdownRemainingMs(startedAt, rule.totalMs, now);
    const passed = countPassedMarks(remaining, rule.penaltyMarksMs);
    if (passed > 0) {
        __classPrivateFieldGet(this, _GameEngine_score, "f").applyCountdownMarks(passed);
    }
    if (remaining <= 0) {
        __classPrivateFieldSet(this, _GameEngine_phase, "Failed", "f");
        __classPrivateFieldSet(this, _GameEngine_failedAtMs, now, "f");
        // The attempt is over, so the pending linger must not survive it.
        // Otherwise the next tick would restore the Run phase and the expired
        // countdown would fail the attempt a second time.
        __classPrivateFieldSet(this, _GameEngine_linger, null, "f");
        __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "failed" });
    }
}, _GameEngine_resolvePopup = function _GameEngine_resolvePopup(now) {
    if (!__classPrivateFieldGet(this, _GameEngine_popupOpen, "f") || !__classPrivateFieldGet(this, _GameEngine_popupIsFree, "f")) {
        return;
    }
    const startedAt = __classPrivateFieldGet(this, _GameEngine_startedAtMs, "f");
    const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup;
    if (startedAt === null || rule === null || rule.kind !== "metered") {
        return;
    }
    if (now < startedAt + rule.freeMs) {
        return;
    }
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_closePopup).call(this, now);
}, _GameEngine_closePopup = function _GameEngine_closePopup(now) {
    let charged = 0;
    const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup;
    const sessionMs = now - __classPrivateFieldGet(this, _GameEngine_popupOpenedAtMs, "f");
    __classPrivateFieldSet(this, _GameEngine_totalViewMs, __classPrivateFieldGet(this, _GameEngine_totalViewMs, "f") + sessionMs, "f");
    if (rule !== null && rule.kind === "free") {
        __classPrivateFieldSet(this, _GameEngine_popupIsFree, false, "f");
    }
    else if (__classPrivateFieldGet(this, _GameEngine_popupIsFree, "f")) {
        __classPrivateFieldSet(this, _GameEngine_freePopupSpent, true, "f");
    }
    else if (rule !== null && rule.kind === "metered") {
        const billableMs = Math.max(0, sessionMs - rule.graceMs);
        __classPrivateFieldSet(this, _GameEngine_meteredViewMs, __classPrivateFieldGet(this, _GameEngine_meteredViewMs, "f") + billableMs, "f");
        const totalUnits = commencedUnits(__classPrivateFieldGet(this, _GameEngine_meteredViewMs, "f"), rule.meterUnitMs);
        charged = __classPrivateFieldGet(this, _GameEngine_score, "f").chargeMeteredUnits(totalUnits);
    }
    __classPrivateFieldSet(this, _GameEngine_popupOpen, false, "f");
    __classPrivateFieldSet(this, _GameEngine_popupIsFree, false, "f");
    __classPrivateFieldGet(this, _GameEngine_instances, "m", _GameEngine_emit).call(this, { type: "popup-closed", chargedPoints: charged });
    return charged;
}, _GameEngine_popupState = function _GameEngine_popupState(now) {
    const rule = __classPrivateFieldGet(this, _GameEngine_level, "f").orderPopup;
    if (rule === null) {
        return null;
    }
    if (rule.kind === "free") {
        return {
            open: __classPrivateFieldGet(this, _GameEngine_popupOpen, "f"),
            free: true,
            freeRemainingMs: 0,
            chargedPoints: 0,
            pendingUnits: 0,
            viewedMs: 0,
            sessionMs: 0,
            sessionClockMs: 0,
            chargedMs: 0,
        };
    }
    const startedAt = __classPrivateFieldGet(this, _GameEngine_startedAtMs, "f");
    const freeRemaining = startedAt !== null
        ? freePopupRemainingMs(startedAt, rule.freeMs, now)
        : rule.freeMs;
    let pendingUnits = 0;
    let sessionMs = 0;
    let chargedMs = 0;
    let sessionClockMs = 0;
    if (__classPrivateFieldGet(this, _GameEngine_popupOpen, "f")) {
        sessionMs = now - __classPrivateFieldGet(this, _GameEngine_popupOpenedAtMs, "f");
        if (__classPrivateFieldGet(this, _GameEngine_popupIsFree, "f")) {
            sessionClockMs = sessionMs;
        }
        else {
            sessionClockMs = sessionMs - rule.graceMs;
            const billableMs = Math.max(0, sessionMs - rule.graceMs);
            chargedMs = __classPrivateFieldGet(this, _GameEngine_meteredViewMs, "f") + billableMs;
            const totalUnits = commencedUnits(chargedMs, rule.meterUnitMs);
            pendingUnits = Math.max(0, totalUnits - __classPrivateFieldGet(this, _GameEngine_score, "f").meteredUnitsCharged);
        }
    }
    return {
        open: __classPrivateFieldGet(this, _GameEngine_popupOpen, "f"),
        free: __classPrivateFieldGet(this, _GameEngine_popupIsFree, "f"),
        freeRemainingMs: freeRemaining,
        chargedPoints: __classPrivateFieldGet(this, _GameEngine_score, "f").meteredUnitsCharged,
        pendingUnits,
        viewedMs: __classPrivateFieldGet(this, _GameEngine_totalViewMs, "f") + sessionMs,
        sessionMs,
        sessionClockMs,
        chargedMs,
    };
};
//# sourceMappingURL=run-state.js.map