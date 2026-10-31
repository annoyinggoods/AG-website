// version.js
const m_version_js = (function () {
const GAME_NAME = "nAG";
const GAME_VERSION = "0.1.0";

return { GAME_NAME: GAME_NAME, GAME_VERSION: GAME_VERSION };
})();

// engine/shuffle.js
const m_engine_shuffle_js = (function () {
function fisherYatesShuffle(items, rand) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const moved = out[i];
        out[i] = out[j];
        out[j] = moved;
    }
    return out;
}
function buildDeal(config, rand) {
    const placed = [];
    config.units.forEach((unit, unitId) => {
        unit.faces.forEach((face) => {
            placed.push({ id: -1, face, unitId });
        });
    });
    const cards = fisherYatesShuffle(placed, rand).map((card, id) => ({ ...card, id }));
    const units = config.units.map((unit, unitId) => {
        const cardIds = cards.filter((card) => card.unitId === unitId).map((card) => card.id);
        return { id: unitId, faces: unit.faces, cardIds };
    });
    return { cards, units };
}
function createCryptoRandom() {
    return () => {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / 0x100000000;
    };
}

return { fisherYatesShuffle: fisherYatesShuffle, buildDeal: buildDeal, createCryptoRandom: createCryptoRandom };
})();

// engine/levels.js
const m_engine_levels_js = (function (fisherYatesShuffle = m_engine_shuffle_js.fisherYatesShuffle) {

const LETTER_OFFSET_A = 65;
function numberPairUnits(highest) {
    const units = [];
    for (let n = 1; n <= highest; n++) {
        units.push({ faces: [String(n), String(n)] });
    }
    return units;
}
function letterNumberPairUnits() {
    const units = [];
    for (let n = 1; n <= 18; n++) {
        units.push({ faces: [String(n), String.fromCharCode(LETTER_OFFSET_A + n - 1)] });
    }
    return units;
}
function singleCardUnits(faces) {
    return faces.map((face) => ({ faces: [face] }));
}
function letterFaces() {
    const faces = [];
    for (let i = 0; i < 12; i++) {
        faces.push(String.fromCharCode(LETTER_OFFSET_A + i));
    }
    return faces;
}
function numberFaces(highest) {
    const faces = [];
    for (let n = 1; n <= highest; n++) {
        faces.push(String(n));
    }
    return faces;
}
const LEVEL4_FACES = [
    "1",
    "2A",
    "2B",
    "3A",
    "3B",
    "3C",
    "4A",
    "4B",
    "4C",
    "4D",
    "5A",
    "5B",
    "5C",
    "5D",
    "5E",
    "6",
    "7",
    "8",
    "9A",
    "9B",
    "9C",
    "9D",
    "9E",
    "9F",
    "10",
];
const LEVEL6_FACES = [...letterFaces(), ...numberFaces(13)];
const LEVEL3_PENALTY_MARKS_MS = [70000, 50000, 30000, 10000];
function level1Config() {
    return {
        id: 1,
        cols: 4,
        rows: 4,
        units: numberPairUnits(8),
        scoutCap: 14,
        scoutEnd: "pair",
        timeRule: { kind: "elapsed" },
        orderPopup: null,
    };
}
function level2Config() {
    return {
        id: 2,
        cols: 6,
        rows: 6,
        units: numberPairUnits(18),
        scoutCap: 19,
        scoutEnd: "pair",
        timeRule: { kind: "elapsed" },
        orderPopup: null,
    };
}
function level3Config() {
    return {
        id: 3,
        cols: 4,
        rows: 4,
        units: numberPairUnits(8),
        scoutCap: 14,
        scoutEnd: "pair",
        timeRule: { kind: "countdown", totalMs: 90000, penaltyMarksMs: LEVEL3_PENALTY_MARKS_MS },
        orderPopup: null,
    };
}
function level4Config() {
    return {
        id: 4,
        cols: 5,
        rows: 5,
        units: singleCardUnits(LEVEL4_FACES),
        scoutCap: 20,
        scoutEnd: "sequence",
        timeRule: { kind: "elapsed" },
        orderPopup: null,
    };
}
function level5Config() {
    return {
        id: 5,
        cols: 6,
        rows: 6,
        units: letterNumberPairUnits(),
        scoutCap: 25,
        scoutEnd: "pair",
        timeRule: { kind: "elapsed" },
        orderPopup: { kind: "free", stripRetireAfterPairs: 3 },
    };
}
function createLevel6Config(rand) {
    const order = fisherYatesShuffle(LEVEL6_FACES, rand);
    return {
        id: 6,
        cols: 5,
        rows: 5,
        units: singleCardUnits(order),
        scoutCap: 20,
        scoutEnd: "sequence",
        timeRule: { kind: "elapsed" },
        orderPopup: { kind: "metered", freeMs: 15000, meterUnitMs: 1500, graceMs: 1000 },
    };
}
function createLevel(id, rand) {
    if (id === 6) {
        if (rand === undefined) {
            throw new Error("Level 6 needs a randomness source for its order permutation");
        }
        return createLevel6Config(rand);
    }
    switch (id) {
        case 1:
            return level1Config();
        case 2:
            return level2Config();
        case 3:
            return level3Config();
        case 4:
            return level4Config();
        case 5:
            return level5Config();
        default:
            throw new Error(`Unknown level id: ${id}`);
    }
}

return { level1Config: level1Config, level2Config: level2Config, level3Config: level3Config, level4Config: level4Config, level5Config: level5Config, createLevel6Config: createLevel6Config, createLevel: createLevel };
})();

// engine/order.js
const m_engine_order_js = (function () {
function requiredOrder(unitCount, anchorUnitId) {
    const order = [];
    for (let step = 0; step < unitCount; step++) {
        order.push((anchorUnitId + step) % unitCount);
    }
    return order;
}

return { requiredOrder: requiredOrder };
})();

// engine/scoring.js
const m_engine_scoring_js = (function () {
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Score_value, _Score_completedUnits, _Score_countdownMarksApplied, _Score_meteredUnitsCharged;
const COUNTDOWN_MARK_PENALTY = 2;
class Score {
    constructor() {
        _Score_value.set(this, 0);
        _Score_completedUnits.set(this, new Set());
        _Score_countdownMarksApplied.set(this, 0);
        _Score_meteredUnitsCharged.set(this, 0);
    }
    get value() {
        return __classPrivateFieldGet(this, _Score_value, "f");
    }
    get completedUnitIds() {
        return [...__classPrivateFieldGet(this, _Score_completedUnits, "f")].sort((a, b) => a - b);
    }
    get meteredUnitsCharged() {
        return __classPrivateFieldGet(this, _Score_meteredUnitsCharged, "f");
    }
    awardUnit(unitId) {
        if (__classPrivateFieldGet(this, _Score_completedUnits, "f").has(unitId)) {
            return false;
        }
        __classPrivateFieldGet(this, _Score_completedUnits, "f").add(unitId);
        __classPrivateFieldSet(this, _Score_value, __classPrivateFieldGet(this, _Score_value, "f") + 1, "f");
        return true;
    }
    penalizeWrongFlip() {
        __classPrivateFieldSet(this, _Score_value, __classPrivateFieldGet(this, _Score_value, "f") - 1, "f");
    }
    applyCountdownMarks(totalPassed) {
        const fresh = Math.max(0, totalPassed - __classPrivateFieldGet(this, _Score_countdownMarksApplied, "f"));
        __classPrivateFieldSet(this, _Score_countdownMarksApplied, Math.max(__classPrivateFieldGet(this, _Score_countdownMarksApplied, "f"), totalPassed), "f");
        __classPrivateFieldSet(this, _Score_value, __classPrivateFieldGet(this, _Score_value, "f") - fresh * COUNTDOWN_MARK_PENALTY, "f");
        return fresh;
    }
    chargeMeteredUnits(totalUnits) {
        const fresh = Math.max(0, totalUnits - __classPrivateFieldGet(this, _Score_meteredUnitsCharged, "f"));
        __classPrivateFieldSet(this, _Score_meteredUnitsCharged, Math.max(__classPrivateFieldGet(this, _Score_meteredUnitsCharged, "f"), totalUnits), "f");
        __classPrivateFieldSet(this, _Score_value, __classPrivateFieldGet(this, _Score_value, "f") - fresh, "f");
        return fresh;
    }
}
_Score_value = new WeakMap(), _Score_completedUnits = new WeakMap(), _Score_countdownMarksApplied = new WeakMap(), _Score_meteredUnitsCharged = new WeakMap();

return { Score: Score };
})();

// engine/timer-model.js
const m_engine_timer_model_js = (function () {
function elapsedMs(startedAtMs, nowMs, stoppedAtMs) {
    const end = stoppedAtMs ?? nowMs;
    return end - startedAtMs;
}
function countdownRemainingMs(startedAtMs, totalMs, nowMs) {
    return totalMs - (nowMs - startedAtMs);
}
function countPassedMarks(remainingMs, marksMs) {
    return marksMs.filter((mark) => remainingMs <= mark).length;
}
function freePopupRemainingMs(startedAtMs, freeMs, nowMs) {
    return Math.max(0, freeMs - (nowMs - startedAtMs));
}
function commencedUnits(viewMs, unitMs) {
    if (viewMs <= 0) {
        return 0;
    }
    return Math.ceil(viewMs / unitMs);
}

return { elapsedMs: elapsedMs, countdownRemainingMs: countdownRemainingMs, countPassedMarks: countPassedMarks, freePopupRemainingMs: freePopupRemainingMs, commencedUnits: commencedUnits };
})();

// engine/run-state.js
const m_engine_run_state_js = (function (requiredOrder = m_engine_order_js.requiredOrder, Score = m_engine_scoring_js.Score, commencedUnits = m_engine_timer_model_js.commencedUnits, countPassedMarks = m_engine_timer_model_js.countPassedMarks, countdownRemainingMs = m_engine_timer_model_js.countdownRemainingMs, elapsedMs = m_engine_timer_model_js.elapsedMs, freePopupRemainingMs = m_engine_timer_model_js.freePopupRemainingMs) {
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
const LINGER_MS = 4000;
const LAST_DEDUCIBLE_CARD_COUNT = 2;
class GameEngine {
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

return { LINGER_MS: LINGER_MS, GameEngine: GameEngine };
})();

// mount.js
const m_mount_js = (function () {
/**
 * The container the game mounts into. The site page carries the heading and
 * the page chrome, and the game fills this one container inside it.
 */
const MOUNT_SELECTOR = "#nag-app";
/**
 * The element that holds the game, which the order popup makes inert around
 * itself.
 */
function findAppRoot() {
    const app = document.querySelector(MOUNT_SELECTOR);
    return app instanceof HTMLElement ? app : null;
}
/**
 * Brings the game into view.
 *
 * The game lives inside a long page here, so the board can sit above or
 * below the fold. The scroll is made instant, because the site scrolls
 * smoothly and a smooth scroll takes long enough for the game clock to run
 * on before the player has even seen the board.
 */
function scrollGameIntoView(target) {
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
}

return { MOUNT_SELECTOR: MOUNT_SELECTOR, findAppRoot: findAppRoot, scrollGameIntoView: scrollGameIntoView };
})();

// ui/board.js
const m_ui_board_js = (function () {
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
class BoardUI {
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

return { BoardUI: BoardUI };
})();

// ui/confetti.js
const m_ui_confetti_js = (function () {
/**
 * The celebration on the win screen. The module is loaded on demand, so the
 * cost of the library only lands on the run that earned it.
 *
 * The path is built at runtime because the module lives in the assets folder
 * and the page can sit at any depth below the domain root.
 */
const CONFETTI_PATH = "/assets/nag/canvas-confetti.module.mjs";
async function fireConfetti() {
    const module = (await import(CONFETTI_PATH));
    module.default({
        particleCount: 140,
        spread: 70,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.55 },
        disableForReducedMotion: true,
    });
}

return { fireConfetti: fireConfetti };
})();

// ui/dom.js
const m_ui_dom_js = (function () {
function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className !== undefined) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}
function setText(element, text) {
    if (element.textContent === text) {
        return;
    }
    element.textContent = text;
}

return { createElement: createElement, setText: setText };
})();

// ui/format.js
const m_ui_format_js = (function () {
function formatSeconds(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function formatCountdown(ms) {
    const clamped = Math.max(0, ms);
    const totalSeconds = Math.ceil(clamped / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function formatPreciseSeconds(ms) {
    const clamped = Math.max(0, ms);
    const totalSeconds = Math.floor(clamped / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
function formatSignedSeconds(ms) {
    const sign = ms < 0 ? "-" : "";
    return `${sign}${formatPreciseSeconds(Math.abs(ms))}`;
}
function unitFaceLabel(deal, unitId) {
    const unit = deal.units[unitId];
    if (unit === undefined) {
        return "";
    }
    return [...new Set(unit.faces)].join("/");
}

return { formatSeconds: formatSeconds, formatCountdown: formatCountdown, formatPreciseSeconds: formatPreciseSeconds, formatSignedSeconds: formatSignedSeconds, unitFaceLabel: unitFaceLabel };
})();

// ui/history.js
const m_ui_history_js = (function (createElement = m_ui_dom_js.createElement, formatSeconds = m_ui_format_js.formatSeconds) {
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
class HistoryUI {
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
function formatDate(timestampMs) {
    const date = new Date(timestampMs);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

return { HistoryUI: HistoryUI, formatDate: formatDate };
})();

// ui/history-store.js
const m_ui_history_store_js = (function () {
const STORAGE_KEY = "nag.history.v1";
const MAX_ENTRIES = 50;
function createLocalHistoryStorage() {
    return {
        read: () => {
            try {
                return window.localStorage.getItem(STORAGE_KEY);
            }
            catch {
                return null;
            }
        },
        write: (value) => {
            try {
                window.localStorage.setItem(STORAGE_KEY, value);
            }
            catch {
                // Private mode and blocked storage degrade to no persistence.
            }
        },
    };
}
function createHistoryStore(storage) {
    return {
        list: () => readEntries(storage),
        record: (entry) => {
            const entries = [entry, ...readEntries(storage)].slice(0, MAX_ENTRIES);
            storage.write(JSON.stringify(entries));
        },
        clear: () => {
            storage.write("[]");
        },
    };
}
function readEntries(storage) {
    const raw = storage.read();
    if (raw === null) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return [];
    }
    if (!Array.isArray(parsed)) {
        return [];
    }
    return parsed.filter(isHistoryEntry);
}
function isHistoryEntry(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const entry = value;
    return (typeof entry.levelId === "number" &&
        typeof entry.timeMs === "number" &&
        typeof entry.score === "number" &&
        typeof entry.playedAtMs === "number" &&
        typeof entry.progress === "number" &&
        typeof entry.unitCount === "number" &&
        typeof entry.won === "boolean");
}

return { createLocalHistoryStorage: createLocalHistoryStorage, createHistoryStore: createHistoryStore };
})();

// ui/instructions.js
const m_ui_instructions_js = (function (createElement = m_ui_dom_js.createElement) {
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
var _InstructionsUI_instances, _InstructionsUI_details, _InstructionsUI_wideQuery, _InstructionsUI_applyOpenState;
function unitNoun(level) {
    return level.scoutEnd === "pair" ? "Pair" : "Card";
}
function instructionsForLevel(level) {
    const sections = [];
    sections.push(whatThisLevelIsSection(level));
    sections.push(...scoutSections(level));
    sections.push(theRunSection(level));
    sections.push(winningSection(level));
    const levelRules = levelRuleSections(level);
    if (levelRules.length > 0) {
        sections.push(...levelRules);
    }
    return sections;
}
function whatThisLevelIsSection(level) {
    const size = `${level.cols} by ${level.rows}`;
    const noun = unitNoun(level).toLowerCase();
    const count = level.units.length;
    const faces = describeFaces(level);
    const lines = [
        `This is a ${size} grid with ${count} ${noun}s on it${faces}.`,
        "Every game deals a brand new random shuffle, so no two games look the same.",
    ];
    if (level.scoutEnd === "pair") {
        lines.push(pairKindLine(level));
    }
    else {
        lines.push("Every card on this level is different. Your job is to find them all in the right order.");
    }
    return { heading: `Level ${level.id}`, lines };
}
function pairKindLine(level) {
    if (level.id === 5) {
        return "Each pair is one number and one letter, and the number tells you which letter it belongs with.";
    }
    return "Each pair is two cards showing the same thing. Your job is to find all the pairs.";
}
function describeFaces(level) {
    const faces = level.units.map((unit) => unit.faces[0] ?? "");
    if (faces.length === 0) {
        return "";
    }
    if (hasShuffledOrder(level)) {
        return describeFaceSet(faces);
    }
    if (level.id === 5) {
        return " (numbers and letters)";
    }
    const first = faces[0];
    const last = faces[faces.length - 1];
    return ` (${first} through ${last})`;
}
function describeFaceSet(faces) {
    const letters = faces.filter((face) => /^[A-Z]$/.test(face));
    const numbers = faces.filter((face) => /^\d+$/.test(face));
    const parts = [];
    if (letters.length > 0) {
        parts.push(`${letters.length} letters`);
    }
    if (numbers.length > 0) {
        parts.push(`${numbers.length} numbers`);
    }
    if (parts.length === 0) {
        return "";
    }
    return ` (${parts.join(" and ")})`;
}
function hasShuffledOrder(level) {
    return level.orderPopup !== null && level.orderPopup.kind === "metered";
}
function scoutSections(level) {
    const orderSource = orderSourcePhrase(level);
    if (level.scoutEnd === "pair") {
        return [
            {
                heading: "Part 1: Look around",
                lines: [
                    "Turn over any cards you like and have a good look at them. Nothing hides while you do this and you cannot lose any points.",
                    `The very first card you turn over chooses your pair. ${anchorPickLine(level)}`,
                    "Keep turning cards over until you find the other half of that pair. That is when Part 1 ends.",
                    `If you turn over ${level.scoutCap} cards and still have not found it, the board hides everything, costs you nothing, and Part 1 starts over.`,
                ],
            },
            {
                heading: "Part 2: The run",
                lines: [
                    "Now you know one pair for certain: the pair you started with. That pair is called your anchor.",
                    `${orderSource} It starts with your anchor and then goes in order from there.`,
                    "Turn over the cards in that order. Once you turn over a card it stays face up, so you can see where you are.",
                    "Turn over the wrong card and you lose 1 point. The board hides everything, and the run starts again from your anchor.",
                    "The first time you turn over any particular card costs you nothing, because the look-around already told you what was on it. Turn over the same card a second time and it costs 1 point.",
                    "There is one exception. When only two cards are still hidden, no wrong guess is free, because you could work out the answer without looking.",
                ],
            },
        ];
    }
    return [
        {
            heading: "Part 1: Look around",
            lines: [
                "Turn over any cards you like and have a good look at them. Nothing hides while you do this and you cannot lose any points.",
                `The very first card you turn over is your anchor. ${orderSource}`,
                "Keep turning cards over until you find the card that comes straight after your anchor in the order. That is when Part 1 ends.",
                `If you turn over ${level.scoutCap} cards and still have not found it, the board hides everything, costs you nothing, and Part 1 starts over.`,
            ],
        },
        {
            heading: "Part 2: The run",
            lines: [
                "Now the order to play is settled, starting from your anchor and wrapping around the end of the list.",
                "Turn over the cards in that order. Once you turn over a card it stays face up, so you can see where you are.",
                "Turn over the wrong card and you lose 1 point. The board hides everything, and the run starts again from your anchor.",
                "The first time you turn over any particular card costs you nothing, because the look-around already told you what was on it. Turn over the same card a second time and it costs 1 point.",
                "There is one exception. When only two cards are still hidden, no wrong guess is free, because you could work out the answer without looking.",
            ],
        },
    ];
}
function orderSourcePhrase(level) {
    if (hasShuffledOrder(level)) {
        return "The order you memorized shows what comes after it.";
    }
    return "The list under the board shows what comes after it.";
}
function anchorPickLine(level) {
    if (level.id === 5) {
        return "Say you turn over a 4. Your pair is now the 4 and the D that goes with it.";
    }
    return "Say you turn over a 4. Your pair is now the two 4s.";
}
function theRunSection(level) {
    return {
        heading: "What wrapping around means",
        lines: wrapAroundExample(level),
    };
}
function wrapAroundExample(level) {
    const faces = level.units.map((unit) => unit.faces[0] ?? "");
    if (faces.length < 4) {
        return [
            "You play every card once, starting from your anchor and working forwards through the list.",
            "When you reach the end of the list you carry on from the beginning again, so every card gets its turn.",
        ];
    }
    if (hasShuffledOrder(level)) {
        return [
            "The order you memorized runs in a circle, so it does not matter where your anchor sits.",
            "You play your anchor, then the card that comes after it in the order you memorized, and carry on all the way round until every card has been played.",
        ];
    }
    if (level.id === 5) {
        return [
            "The list runs in a circle, so it does not matter where your anchor sits.",
            "You play your anchor pair, then the next pair along, and carry on all the way round until every pair has been played.",
        ];
    }
    const anchorIndex = 2;
    const anchorFace = faces[anchorIndex];
    const ordered = [...faces.slice(anchorIndex), ...faces.slice(0, anchorIndex)];
    const head = ordered.slice(0, 4);
    const tail = ordered.slice(4, 7);
    const last = ordered[ordered.length - 1];
    return [
        `Say your anchor is ${anchorFace}. You play ${head.join(", ")}, then carry on with ${tail.join(", ")}, and so on until you finish with ${last}.`,
        "That is what wrapping around means. You do not stop at the end of the list, you carry on from the beginning until every card has been played.",
    ];
}
function winningSection(level) {
    const noun = unitNoun(level).toLowerCase();
    const lines = [
        `You win by playing every ${noun} in one single go with no mistakes.`,
        "You get 1 point for each one you finish, but only the first time you finish it. Your score can go below zero.",
    ];
    if (level.timeRule.kind === "countdown") {
        lines.push("If you run out of time, that attempt is over and you start the level again.");
    }
    return { heading: "Winning and scoring", lines };
}
function levelRuleSections(level) {
    const sections = [];
    if (level.timeRule.kind === "countdown") {
        const totalSeconds = Math.round(level.timeRule.totalMs / 1000);
        const marks = level.timeRule.penaltyMarksMs.map((mark) => Math.round(mark / 1000));
        const markList = marks.join(", ");
        const firstMark = marks[0] ?? 0;
        const freeSeconds = totalSeconds - firstMark;
        sections.push({
            heading: "The Level 3 countdown",
            lines: [
                `You have ${totalSeconds} seconds and the clock starts the moment you press PLAY. If it reaches zero you lose that attempt.`,
                `The first ${freeSeconds} seconds are free. After that you lose 2 points every 20 seconds, so you will see -2 appear at ${markList} seconds left.`,
                "Finishing the level before the clock runs out is the whole trick on this level.",
            ],
        });
    }
    if (level.id === 4) {
        sections.push(level4Section());
    }
    if (level.id === 5) {
        sections.push(...level5Sections());
    }
    if (level.id === 6) {
        sections.push(...level6Sections());
    }
    return sections;
}
function level4Section() {
    return {
        heading: "The Level 4 order",
        lines: [
            "Every card on this level is different, so there is nothing to match up. The list under the board is the order to play.",
            "Turn cards over in the order the list gives, starting from your anchor and wrapping around the end of the list.",
            "Get one wrong and the board hides everything, and you start the run again from your anchor.",
        ],
    };
}
function level5Sections() {
    return [
        {
            heading: "The Level 5 pairs",
            lines: [
                "The number tells you the letter. 1 goes with A, 2 goes with B, 3 goes with C, and so on up to 18 and R.",
                "So the 1 and the A are a pair, the 2 and the B are a pair, and the 18 and the R are a pair.",
                "You can turn either half of a pair over first, but you cannot turn over a third card in between.",
            ],
        },
        {
            heading: "When the order list disappears",
            lines: [
                "The list under the board shows you the order until you finish 3 pairs. After that it hides itself.",
                "By then you should have the rule in your head, which is the whole point of this level.",
                "If you do want to check the order later, press REVEAL THE ORDER. It blocks the board while it is open and it costs you no points, but the clock keeps running.",
            ],
        },
    ];
}
function level6Sections() {
    return [
        {
            heading: "The Level 6 order",
            lines: [
                "The order changes every game, so there is nothing to learn. You have to remember it.",
                "When you press PLAY the clock starts and the order appears for 15 free seconds. Look at it, then memorize it.",
                "The list closes itself when the 15 seconds are up. Nothing is lost if you close it early.",
            ],
        },
        {
            heading: "REVEAL THE ORDER",
            lines: [
                "If you need to check the order later, press REVEAL THE ORDER under the board.",
                "The first second of every look is free, so you get a moment to find your place before anything is charged.",
                "After that, every started 1.5 seconds of looking costs you 1 point. Look for 3 seconds and that is 2 points.",
                "The board is blocked while the list is open and the clock keeps running, so use it carefully.",
                "After that the scout and the run work exactly like Level 4, against the order you memorized.",
            ],
        },
    ];
}
class InstructionsUI {
    constructor(root) {
        _InstructionsUI_instances.add(this);
        _InstructionsUI_details.set(this, void 0);
        _InstructionsUI_wideQuery.set(this, void 0);
        __classPrivateFieldSet(this, _InstructionsUI_details, createElement("details", "nag-instructions"), "f");
        __classPrivateFieldGet(this, _InstructionsUI_details, "f").append(createElement("summary", "nag-instructions-title", "How to play"));
        __classPrivateFieldSet(this, _InstructionsUI_wideQuery, window.matchMedia("(min-width: 48rem)"), "f");
        __classPrivateFieldGet(this, _InstructionsUI_wideQuery, "f").addEventListener("change", () => __classPrivateFieldGet(this, _InstructionsUI_instances, "m", _InstructionsUI_applyOpenState).call(this));
        root.append(__classPrivateFieldGet(this, _InstructionsUI_details, "f"));
    }
    render(level) {
        const sections = instructionsForLevel(level).map((section, index) => {
            const block = createElement("section", "nag-instruction");
            block.append(createElement(headingTag(index), "nag-instruction-heading", section.heading));
            const list = createElement("ul", "nag-instruction-list");
            for (const line of section.lines) {
                list.append(createElement("li", "nag-instruction-item", line));
            }
            block.append(list);
            return block;
        });
        const content = createElement("div", "nag-instructions-body");
        content.append(...sections);
        __classPrivateFieldGet(this, _InstructionsUI_details, "f").replaceChildren(createElement("summary", "nag-instructions-title", "How to play"), content);
        __classPrivateFieldGet(this, _InstructionsUI_instances, "m", _InstructionsUI_applyOpenState).call(this);
    }
}
_InstructionsUI_details = new WeakMap(), _InstructionsUI_wideQuery = new WeakMap(), _InstructionsUI_instances = new WeakSet(), _InstructionsUI_applyOpenState = function _InstructionsUI_applyOpenState() {
    __classPrivateFieldGet(this, _InstructionsUI_details, "f").open = __classPrivateFieldGet(this, _InstructionsUI_wideQuery, "f").matches;
};
/**
 * The page title is the h1 and the first instruction block is the level
 * itself, so the level heading is the h2 of the instructions and the blocks
 * below it are h3. That keeps the heading order valid without an extra
 * heading that would only repeat the region label.
 */
function headingTag(index) {
    return index === 0 ? "h2" : "h3";
}

return { unitNoun: unitNoun, instructionsForLevel: instructionsForLevel, InstructionsUI: InstructionsUI };
})();

// ui/hud.js
const m_ui_hud_js = (function (countPassedMarks = m_engine_timer_model_js.countPassedMarks, createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, formatCountdown = m_ui_format_js.formatCountdown, formatSeconds = m_ui_format_js.formatSeconds, unitNoun = m_ui_instructions_js.unitNoun) {
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
var _HudUI_instances, _HudUI_root, _HudUI_levelSelect, _HudUI_scoreValue, _HudUI_timeValue, _HudUI_timeCaption, _HudUI_progressValue, _HudUI_phaseValue, _HudUI_viewCostGroup, _HudUI_viewCostValue, _HudUI_viewTimeGroup, _HudUI_viewTimeValue, _HudUI_deductionBadge, _HudUI_callbacks, _HudUI_passedMarks, _HudUI_hudGroup, _HudUI_updateViewCost, _HudUI_updateDeductionFlash;




const ACTIVE_PHASES = ["Scout", "Linger", "Run"];
class HudUI {
    constructor(root, levels, callbacks) {
        _HudUI_instances.add(this);
        _HudUI_root.set(this, void 0);
        _HudUI_levelSelect.set(this, void 0);
        _HudUI_scoreValue.set(this, void 0);
        _HudUI_timeValue.set(this, void 0);
        _HudUI_timeCaption.set(this, void 0);
        _HudUI_progressValue.set(this, void 0);
        _HudUI_phaseValue.set(this, void 0);
        _HudUI_viewCostGroup.set(this, void 0);
        _HudUI_viewCostValue.set(this, void 0);
        _HudUI_viewTimeGroup.set(this, void 0);
        _HudUI_viewTimeValue.set(this, void 0);
        _HudUI_deductionBadge.set(this, void 0);
        _HudUI_callbacks.set(this, void 0);
        _HudUI_passedMarks.set(this, 0);
        __classPrivateFieldSet(this, _HudUI_root, root, "f");
        __classPrivateFieldSet(this, _HudUI_callbacks, callbacks, "f");
        __classPrivateFieldGet(this, _HudUI_root, "f").classList.add("nag-hud");
        __classPrivateFieldSet(this, _HudUI_levelSelect, createElement("select", "nag-hud-level-select"), "f");
        __classPrivateFieldGet(this, _HudUI_levelSelect, "f").setAttribute("aria-label", "Choose level");
        for (const level of levels) {
            const option = createElement("option", "nag-hud-level-option", level.label);
            option.value = String(level.id);
            __classPrivateFieldGet(this, _HudUI_levelSelect, "f").append(option);
        }
        __classPrivateFieldGet(this, _HudUI_levelSelect, "f").addEventListener("change", () => {
            const chosen = Number(__classPrivateFieldGet(this, _HudUI_levelSelect, "f").value);
            if (Number.isInteger(chosen)) {
                __classPrivateFieldGet(this, _HudUI_callbacks, "f").onSelectLevel(chosen);
            }
        });
        __classPrivateFieldSet(this, _HudUI_scoreValue, createElement("span", "nag-hud-value nag-hud-score", "0"), "f");
        __classPrivateFieldGet(this, _HudUI_scoreValue, "f").setAttribute("role", "status");
        __classPrivateFieldGet(this, _HudUI_scoreValue, "f").setAttribute("aria-live", "polite");
        __classPrivateFieldSet(this, _HudUI_timeValue, createElement("span", "nag-hud-value nag-hud-time", "0:00"), "f");
        __classPrivateFieldSet(this, _HudUI_timeCaption, createElement("span", "nag-hud-caption nag-hud-time-caption", "Elapsed"), "f");
        __classPrivateFieldSet(this, _HudUI_progressValue, createElement("span", "nag-hud-value nag-hud-progress", "Pair 0/8"), "f");
        __classPrivateFieldSet(this, _HudUI_phaseValue, createElement("span", "nag-hud-value nag-hud-phase", "Idle"), "f");
        __classPrivateFieldSet(this, _HudUI_deductionBadge, createElement("span", "nag-hud-deduction", ""), "f");
        __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").setAttribute("role", "status");
        __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").setAttribute("aria-live", "polite");
        const timeGroup = __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "Time", __classPrivateFieldGet(this, _HudUI_timeValue, "f"), __classPrivateFieldGet(this, _HudUI_timeCaption, "f"));
        timeGroup.append(__classPrivateFieldGet(this, _HudUI_deductionBadge, "f"));
        __classPrivateFieldSet(this, _HudUI_viewCostValue, createElement("span", "nag-hud-value nag-hud-viewcost", "0"), "f");
        __classPrivateFieldSet(this, _HudUI_viewCostGroup, __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "View cost", __classPrivateFieldGet(this, _HudUI_viewCostValue, "f")), "f");
        __classPrivateFieldSet(this, _HudUI_viewTimeValue, createElement("span", "nag-hud-value nag-hud-viewtime", "0:00"), "f");
        __classPrivateFieldSet(this, _HudUI_viewTimeGroup, __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "View time", __classPrivateFieldGet(this, _HudUI_viewTimeValue, "f")), "f");
        __classPrivateFieldGet(this, _HudUI_root, "f").replaceChildren(__classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "Level", __classPrivateFieldGet(this, _HudUI_levelSelect, "f")), __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "Score", __classPrivateFieldGet(this, _HudUI_scoreValue, "f")), timeGroup, __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "Progress", __classPrivateFieldGet(this, _HudUI_progressValue, "f")), __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_hudGroup).call(this, "Phase", __classPrivateFieldGet(this, _HudUI_phaseValue, "f")), __classPrivateFieldGet(this, _HudUI_viewCostGroup, "f"), __classPrivateFieldGet(this, _HudUI_viewTimeGroup, "f"));
    }
    get levelSelect() {
        return __classPrivateFieldGet(this, _HudUI_levelSelect, "f");
    }
    setLevel(levelId) {
        __classPrivateFieldGet(this, _HudUI_levelSelect, "f").value = String(levelId);
        __classPrivateFieldGet(this, _HudUI_root, "f").dataset.level = String(levelId);
    }
    render(state, level) {
        this.setLevel(state.levelId);
        setText(__classPrivateFieldGet(this, _HudUI_scoreValue, "f"), String(state.score));
        __classPrivateFieldGet(this, _HudUI_scoreValue, "f").classList.toggle("is-negative", state.score < 0);
        if (level.timeRule.kind === "countdown" && state.countdownRemainingMs !== null) {
            setText(__classPrivateFieldGet(this, _HudUI_timeCaption, "f"), "Remaining");
            setText(__classPrivateFieldGet(this, _HudUI_timeValue, "f"), formatCountdown(state.countdownRemainingMs));
            __classPrivateFieldGet(this, _HudUI_timeValue, "f").classList.toggle("is-urgent", state.countdownRemainingMs <= 20000);
        }
        else {
            setText(__classPrivateFieldGet(this, _HudUI_timeCaption, "f"), "Elapsed");
            setText(__classPrivateFieldGet(this, _HudUI_timeValue, "f"), formatSeconds(state.elapsedMs));
            __classPrivateFieldGet(this, _HudUI_timeValue, "f").classList.remove("is-urgent");
        }
        const noun = unitNoun(level);
        setText(__classPrivateFieldGet(this, _HudUI_progressValue, "f"), `${noun} ${state.completedUnitIds.length}/${state.unitCount}`);
        setText(__classPrivateFieldGet(this, _HudUI_phaseValue, "f"), phaseLabel(state.phase));
        __classPrivateFieldGet(this, _HudUI_phaseValue, "f").className = `nag-hud-value nag-hud-phase nag-phase-${state.phase.toLowerCase()}`;
        __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_updateViewCost).call(this, state, level);
        __classPrivateFieldGet(this, _HudUI_instances, "m", _HudUI_updateDeductionFlash).call(this, state, level);
    }
    resetDeductionFlash() {
        __classPrivateFieldSet(this, _HudUI_passedMarks, 0, "f");
        __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").classList.remove("is-flashing");
        setText(__classPrivateFieldGet(this, _HudUI_deductionBadge, "f"), "");
    }
}
_HudUI_root = new WeakMap(), _HudUI_levelSelect = new WeakMap(), _HudUI_scoreValue = new WeakMap(), _HudUI_timeValue = new WeakMap(), _HudUI_timeCaption = new WeakMap(), _HudUI_progressValue = new WeakMap(), _HudUI_phaseValue = new WeakMap(), _HudUI_viewCostGroup = new WeakMap(), _HudUI_viewCostValue = new WeakMap(), _HudUI_viewTimeGroup = new WeakMap(), _HudUI_viewTimeValue = new WeakMap(), _HudUI_deductionBadge = new WeakMap(), _HudUI_callbacks = new WeakMap(), _HudUI_passedMarks = new WeakMap(), _HudUI_instances = new WeakSet(), _HudUI_hudGroup = function _HudUI_hudGroup(label, value, caption) {
    const group = createElement("div", "nag-hud-group");
    group.append(createElement("span", "nag-hud-caption", label));
    group.append(value);
    if (caption !== undefined) {
        group.append(caption);
    }
    return group;
}, _HudUI_updateViewCost = function _HudUI_updateViewCost(state, level) {
    const rule = level.orderPopup;
    const showsCost = rule !== null && rule.kind === "metered";
    __classPrivateFieldGet(this, _HudUI_viewCostGroup, "f").hidden = !showsCost;
    __classPrivateFieldGet(this, _HudUI_viewTimeGroup, "f").hidden = !showsCost;
    if (!showsCost || state.popup === null) {
        setText(__classPrivateFieldGet(this, _HudUI_viewCostValue, "f"), "0");
        setText(__classPrivateFieldGet(this, _HudUI_viewTimeValue, "f"), "0:00");
        return;
    }
    setText(__classPrivateFieldGet(this, _HudUI_viewCostValue, "f"), String(state.popup.chargedPoints));
    __classPrivateFieldGet(this, _HudUI_viewCostValue, "f").classList.toggle("is-negative", state.popup.chargedPoints > 0);
    setText(__classPrivateFieldGet(this, _HudUI_viewTimeValue, "f"), formatSeconds(state.popup.viewedMs));
}, _HudUI_updateDeductionFlash = function _HudUI_updateDeductionFlash(state, level) {
    const rule = level.timeRule;
    const isActive = ACTIVE_PHASES.includes(state.phase);
    if (rule.kind !== "countdown" || state.countdownRemainingMs === null || !isActive) {
        __classPrivateFieldSet(this, _HudUI_passedMarks, 0, "f");
        return;
    }
    const passed = countPassedMarks(state.countdownRemainingMs, rule.penaltyMarksMs);
    const fresh = passed - __classPrivateFieldGet(this, _HudUI_passedMarks, "f");
    __classPrivateFieldSet(this, _HudUI_passedMarks, passed, "f");
    if (fresh <= 0) {
        return;
    }
    setText(__classPrivateFieldGet(this, _HudUI_deductionBadge, "f"), `-${fresh * 2}`);
    __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").classList.remove("is-flashing");
    void __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").offsetWidth;
    __classPrivateFieldGet(this, _HudUI_deductionBadge, "f").classList.add("is-flashing");
};
function phaseLabel(phase) {
    switch (phase) {
        case "Idle":
            return "Idle";
        case "Scout":
            return "Scout (no penalty)";
        case "Linger":
            return "Linger";
        case "Run":
            return "Run";
        case "Win":
            return "Won";
        case "Failed":
            return "Failed";
        default:
            return phase;
    }
}

return { HudUI: HudUI };
})();

// ui/modal-backdrop.js
const m_ui_modal_backdrop_js = (function () {
/**
 * The shell regions that sit under the app container. The order popup lives in
 * one of them, and the rest of the page is made inert while it is open, so a
 * screen reader and a keyboard player only meet the dialog.
 */
const POPUP_REGION_CLASS = "nag-order-popup-region";
/**
 * The elements that hold the game. Everything the visitor can reach that is
 * not part of the game and not the dialog itself is made inert while the
 * dialog is open.
 */
function findBackgroundRegions(app) {
    const regions = [];
    const seen = new Set();
    // The regions inside the game that the dialog does not sit in.
    for (const child of app.children) {
        if (child instanceof HTMLElement && !child.classList.contains(POPUP_REGION_CLASS)) {
            regions.push(child);
            seen.add(child);
        }
    }
    // The site chrome around the game. The walk climbs from the game to the
    // body and collects the siblings on the way, so the menu and the footer go
    // quiet as well while the dialog is open.
    let child = app;
    let parent = app.parentElement;
    while (parent !== null && parent !== document.body) {
        for (const sibling of parent.children) {
            if (sibling === child || !(sibling instanceof HTMLElement)) {
                continue;
            }
            if (!seen.has(sibling)) {
                regions.push(sibling);
                seen.add(sibling);
            }
        }
        child = parent;
        parent = parent.parentElement;
    }
    return regions;
}
/**
 * Wires up the modal behaviour of the order popup.
 *
 * The dialog declares aria-modal, so it has to behave like one: the focus
 * goes in when it opens, the focus cannot leave while it is open, and the
 * page behind it is inert to pointers and to assistive technology.
 */
function createModalBackdrop(app, panel, closeButton) {
    let previousFocus = null;
    let open = false;
    const backgroundRegions = () => findBackgroundRegions(app);
    const setBackgroundInert = (inert) => {
        for (const region of backgroundRegions()) {
            region.inert = inert;
        }
    };
    /**
     * The element that had the focus when the dialog opened. It is found by
     * asking the page rather than by reading the active element at the moment
     * of opening, because a click moves the focus to the body before the
     * opening code runs.
     */
    const findFocusOrigin = () => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
            return active;
        }
        const revealed = app.querySelector("button.nag-reveal-order");
        if (revealed !== null && !revealed.disabled && revealed.offsetParent !== null) {
            return revealed;
        }
        return null;
    };
    /**
     * Where the focus goes back to when the dialog closes. The reveal button
     * is the usual answer, but it is disabled while the popup is up, so the
     * board is the fallback.
     */
    const findFocusTarget = () => {
        const revealed = app.querySelector("button.nag-reveal-order");
        if (revealed !== null && !revealed.disabled && revealed.offsetParent !== null) {
            return revealed;
        }
        const tabStop = app.querySelector(".nag-card[tabindex='0']");
        if (tabStop !== null) {
            return tabStop;
        }
        return app.querySelector(".nag-card");
    };
    /**
     * The dialog holds a single tab stop, the close button, so both directions
     * of the tab key stay on it. The inert background already stops the focus
     * leaving, and this makes the cycle explicit.
     */
    const keepFocusInside = (event) => {
        if (event.key !== "Tab") {
            return;
        }
        event.preventDefault();
        closeButton.focus({ preventScroll: true });
    };
    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            return;
        }
        keepFocusInside(event);
    };
    return {
        open: () => {
            if (open) {
                return;
            }
            open = true;
            // The place to go back to is found before the background is made inert,
            // because an inert element cannot hold the focus.
            previousFocus = findFocusOrigin();
            setBackgroundInert(true);
            panel.addEventListener("keydown", onKeyDown);
            // The focus is placed without scrolling, because the browser would drag
            // the whole page to the button and the game sits inside a long page
            // here. The panel is brought into view instead, which scrolls the
            // least and keeps the whole dialog on screen.
            //
            // The site scrolls smoothly, and a smooth scroll takes long enough for
            // the game clock to run on, so the scroll is made instant.
            closeButton.focus({ preventScroll: true });
            panel.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        },
        close: () => {
            if (!open) {
                return;
            }
            open = false;
            panel.removeEventListener("keydown", onKeyDown);
            // The page is given back before the focus is returned, because a focus
            // target that is still inside an inert region cannot take the focus.
            setBackgroundInert(false);
            const target = previousFocus ?? findFocusTarget();
            previousFocus = null;
            if (target !== null && target.isConnected) {
                target.focus({ preventScroll: true });
            }
        },
    };
}

return { createModalBackdrop: createModalBackdrop };
})();

// ui/order-popup.js
const m_ui_order_popup_js = (function (createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, formatCountdown = m_ui_format_js.formatCountdown, formatSeconds = m_ui_format_js.formatSeconds, formatSignedSeconds = m_ui_format_js.formatSignedSeconds, unitFaceLabel = m_ui_format_js.unitFaceLabel, findAppRoot = m_mount_js.findAppRoot, createModalBackdrop = m_ui_modal_backdrop_js.createModalBackdrop) {
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
class OrderPopupUI {
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

return { OrderPopupUI: OrderPopupUI };
})();

// ui/order-strip.js
const m_ui_order_strip_js = (function (createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, unitFaceLabel = m_ui_format_js.unitFaceLabel) {
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
class OrderStripUI {
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

return { OrderStripUI: OrderStripUI };
})();

// ui/screens.js
const m_ui_screens_js = (function (createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, formatSeconds = m_ui_format_js.formatSeconds, unitNoun = m_ui_instructions_js.unitNoun) {
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
class ScreensUI {
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

return { ScreensUI: ScreensUI };
})();

// ui/stats-display.js
const m_ui_stats_display_js = (function (createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, formatSeconds = m_ui_format_js.formatSeconds) {
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
class StatsDisplayUI {
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

return { StatsDisplayUI: StatsDisplayUI };
})();

// ui/stats-store.js
const m_ui_stats_store_js = (function () {
const STATS_STORAGE_KEY = "nag.stats.v1";
function createLocalStatsStorage() {
    return {
        read: () => {
            try {
                return window.localStorage.getItem(STATS_STORAGE_KEY);
            }
            catch {
                return null;
            }
        },
        write: (value) => {
            try {
                window.localStorage.setItem(STATS_STORAGE_KEY, value);
            }
            catch {
                // Private mode and blocked storage degrade to no persistence.
            }
        },
    };
}
function createStatsStore(storage) {
    return {
        statsFor: (levelId) => readStats(storage)[String(levelId)] ?? zeroStats(),
        record: (levelId, result) => recordResult(storage, levelId, result),
        clear: () => {
            storage.write("{}");
        },
    };
}
function zeroStats() {
    return {
        lastScore: 0,
        lastTimeMs: 0,
        bestScore: null,
        bestTimeMs: null,
        gamesPlayed: 0,
    };
}
function recordResult(storage, levelId, result) {
    const all = readStats(storage);
    const previous = all[String(levelId)] ?? zeroStats();
    const isNewBestScore = result.won && (previous.bestScore === null || result.score > previous.bestScore);
    const isNewBestTime = result.won && (previous.bestTimeMs === null || result.timeMs < previous.bestTimeMs);
    const updated = {
        lastScore: result.score,
        lastTimeMs: result.timeMs,
        bestScore: isNewBestScore ? result.score : previous.bestScore,
        bestTimeMs: isNewBestTime ? result.timeMs : previous.bestTimeMs,
        gamesPlayed: previous.gamesPlayed + 1,
    };
    all[String(levelId)] = updated;
    storage.write(JSON.stringify(all));
    return { isNewBestScore, isNewBestTime };
}
function readStats(storage) {
    const raw = storage.read();
    if (raw === null) {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return {};
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }
    const source = parsed;
    const result = {};
    for (const key of Object.keys(source)) {
        const entry = source[key];
        if (isLevelStats(entry)) {
            result[key] = entry;
        }
    }
    return result;
}
function isLevelStats(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const stats = value;
    return (typeof stats.lastScore === "number" &&
        typeof stats.lastTimeMs === "number" &&
        typeof stats.gamesPlayed === "number" &&
        isNullableNumber(stats.bestScore) &&
        isNullableNumber(stats.bestTimeMs));
}
function isNullableNumber(value) {
    return value === null || typeof value === "number";
}

return { STATS_STORAGE_KEY: STATS_STORAGE_KEY, createLocalStatsStorage: createLocalStatsStorage, createStatsStore: createStatsStore };
})();

// ui/status.js
const m_ui_status_js = (function (createElement = m_ui_dom_js.createElement, setText = m_ui_dom_js.setText, unitFaceLabel = m_ui_format_js.unitFaceLabel) {
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
class StatusUI {
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
function statusForOutcome(outcome, deal, noun) {
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

return { StatusUI: StatusUI, statusForOutcome: statusForOutcome };
})();

// ui/app.js
const m_ui_app_js = (function (createLevel = m_engine_levels_js.createLevel, GameEngine = m_engine_run_state_js.GameEngine, buildDeal = m_engine_shuffle_js.buildDeal, createCryptoRandom = m_engine_shuffle_js.createCryptoRandom, scrollGameIntoView = m_mount_js.scrollGameIntoView, BoardUI = m_ui_board_js.BoardUI, fireConfetti = m_ui_confetti_js.fireConfetti, createElement = m_ui_dom_js.createElement, HistoryUI = m_ui_history_js.HistoryUI, createHistoryStore = m_ui_history_store_js.createHistoryStore, createLocalHistoryStorage = m_ui_history_store_js.createLocalHistoryStorage, HudUI = m_ui_hud_js.HudUI, InstructionsUI = m_ui_instructions_js.InstructionsUI, unitNoun = m_ui_instructions_js.unitNoun, OrderPopupUI = m_ui_order_popup_js.OrderPopupUI, OrderStripUI = m_ui_order_strip_js.OrderStripUI, ScreensUI = m_ui_screens_js.ScreensUI, StatsDisplayUI = m_ui_stats_display_js.StatsDisplayUI, createLocalStatsStorage = m_ui_stats_store_js.createLocalStatsStorage, createStatsStore = m_ui_stats_store_js.createStatsStore, StatusUI = m_ui_status_js.StatusUI, statusForOutcome = m_ui_status_js.statusForOutcome) {
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
var _App_instances, _App_instructions, _App_hud, _App_status, _App_order, _App_orderPopup, _App_board, _App_screens, _App_history, _App_historyStore, _App_stats, _App_statsStore, _App_playButton, _App_restartButton, _App_revealButton, _App_boardRoot, _App_levelId, _App_level, _App_deal, _App_engine, _App_unsubscribe, _App_timerHandle, _App_lingerHandle, _App_bindEngine, _App_enterIdleState, _App_startGame, _App_restart, _App_newAttempt, _App_selectLevel, _App_goToNextLevel, _App_openOrderPopup, _App_closeOrderPopup, _App_startTimer, _App_stopTimer, _App_scheduleLingerHide, _App_handleEngineEvent, _App_handleFlipOutcome, _App_handleWin, _App_handleFail, _App_recordStats, _App_renderStats, _App_recordHistory, _App_renderHistory, _App_clearHistory, _App_nextLevelId, _App_renderHud, _App_renderOrder, _App_showsOrderStrip, _App_renderRevealButton;

















const TICK_INTERVAL_MS = 100;
const LEVEL_OPTIONS = [
    { id: 1, label: "Level 1 - 4x4" },
    { id: 2, label: "Level 2 - 6x6" },
    { id: 3, label: "Level 3 - 4x4 countdown" },
    { id: 4, label: "Level 4 - 5x5 fixed order" },
    { id: 5, label: "Level 5 - 6x6 letter pairs" },
    { id: 6, label: "Level 6 - 5x5 memorized order" },
];
class App {
    constructor(shell) {
        _App_instances.add(this);
        _App_instructions.set(this, void 0);
        _App_hud.set(this, void 0);
        _App_status.set(this, void 0);
        _App_order.set(this, void 0);
        _App_orderPopup.set(this, void 0);
        _App_board.set(this, void 0);
        _App_screens.set(this, void 0);
        _App_history.set(this, void 0);
        _App_historyStore.set(this, void 0);
        _App_stats.set(this, void 0);
        _App_statsStore.set(this, void 0);
        _App_playButton.set(this, void 0);
        _App_restartButton.set(this, void 0);
        _App_revealButton.set(this, void 0);
        _App_boardRoot.set(this, void 0);
        _App_levelId.set(this, void 0);
        _App_level.set(this, void 0);
        _App_deal.set(this, void 0);
        _App_engine.set(this, void 0);
        _App_unsubscribe.set(this, null);
        _App_timerHandle.set(this, null);
        _App_lingerHandle.set(this, null);
        __classPrivateFieldSet(this, _App_levelId, LEVEL_OPTIONS[0].id, "f");
        __classPrivateFieldSet(this, _App_level, createLevel(__classPrivateFieldGet(this, _App_levelId, "f"), createCryptoRandom()), "f");
        __classPrivateFieldSet(this, _App_deal, buildDeal(__classPrivateFieldGet(this, _App_level, "f"), createCryptoRandom()), "f");
        __classPrivateFieldSet(this, _App_engine, new GameEngine(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), () => Date.now()), "f");
        __classPrivateFieldSet(this, _App_historyStore, createHistoryStore(createLocalHistoryStorage()), "f");
        __classPrivateFieldSet(this, _App_statsStore, createStatsStore(createLocalStatsStorage()), "f");
        __classPrivateFieldSet(this, _App_instructions, new InstructionsUI(shell.instructions), "f");
        __classPrivateFieldSet(this, _App_status, new StatusUI(shell.status), "f");
        __classPrivateFieldSet(this, _App_order, new OrderStripUI(shell.order), "f");
        __classPrivateFieldSet(this, _App_orderPopup, new OrderPopupUI(shell.orderPopup, {
            onClose: () => __classPrivateFieldGet(this, _App_instances, "m", _App_closeOrderPopup).call(this),
        }), "f");
        __classPrivateFieldSet(this, _App_board, new BoardUI(shell.board), "f");
        __classPrivateFieldSet(this, _App_boardRoot, shell.board, "f");
        __classPrivateFieldSet(this, _App_hud, new HudUI(shell.hud, LEVEL_OPTIONS, {
            onSelectLevel: (levelId) => __classPrivateFieldGet(this, _App_instances, "m", _App_selectLevel).call(this, levelId),
        }), "f");
        __classPrivateFieldSet(this, _App_screens, new ScreensUI(shell.screen, {
            onPlayAgain: () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this),
            onNextLevel: () => __classPrivateFieldGet(this, _App_instances, "m", _App_goToNextLevel).call(this),
            onRetry: () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this),
        }), "f");
        __classPrivateFieldSet(this, _App_history, new HistoryUI(shell.history, () => __classPrivateFieldGet(this, _App_instances, "m", _App_clearHistory).call(this)), "f");
        __classPrivateFieldSet(this, _App_stats, new StatsDisplayUI(shell.stats), "f");
        __classPrivateFieldSet(this, _App_playButton, createElement("button", "nag-button nag-button-primary nag-play", "PLAY"), "f");
        __classPrivateFieldGet(this, _App_playButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_playButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this));
        __classPrivateFieldSet(this, _App_restartButton, createElement("button", "nag-button nag-button-secondary nag-restart", "RESTART"), "f");
        __classPrivateFieldGet(this, _App_restartButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_restartButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_restart).call(this));
        __classPrivateFieldSet(this, _App_revealButton, createElement("button", "nag-button nag-button-secondary nag-reveal-order", "REVEAL THE ORDER"), "f");
        __classPrivateFieldGet(this, _App_revealButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_revealButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_openOrderPopup).call(this));
        __classPrivateFieldGet(this, _App_revealButton, "f").hidden = true;
        shell.reveal.replaceChildren(__classPrivateFieldGet(this, _App_revealButton, "f"));
        shell.controls.replaceChildren(__classPrivateFieldGet(this, _App_playButton, "f"), __classPrivateFieldGet(this, _App_restartButton, "f"));
        __classPrivateFieldGet(this, _App_instances, "m", _App_bindEngine).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    }
}
_App_instructions = new WeakMap(), _App_hud = new WeakMap(), _App_status = new WeakMap(), _App_order = new WeakMap(), _App_orderPopup = new WeakMap(), _App_board = new WeakMap(), _App_screens = new WeakMap(), _App_history = new WeakMap(), _App_historyStore = new WeakMap(), _App_stats = new WeakMap(), _App_statsStore = new WeakMap(), _App_playButton = new WeakMap(), _App_restartButton = new WeakMap(), _App_revealButton = new WeakMap(), _App_boardRoot = new WeakMap(), _App_levelId = new WeakMap(), _App_level = new WeakMap(), _App_deal = new WeakMap(), _App_engine = new WeakMap(), _App_unsubscribe = new WeakMap(), _App_timerHandle = new WeakMap(), _App_lingerHandle = new WeakMap(), _App_instances = new WeakSet(), _App_bindEngine = function _App_bindEngine() {
    __classPrivateFieldGet(this, _App_unsubscribe, "f")?.call(this);
    __classPrivateFieldSet(this, _App_unsubscribe, __classPrivateFieldGet(this, _App_engine, "f").subscribe((event) => __classPrivateFieldGet(this, _App_instances, "m", _App_handleEngineEvent).call(this, event)), "f");
}, _App_enterIdleState = function _App_enterIdleState() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    // A new attempt drops the popup, so the page has to be given back before
    // the new board is built.
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_instructions, "f").render(__classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = false;
    __classPrivateFieldGet(this, _App_playButton, "f").disabled = false;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = true;
}, _App_startGame = function _App_startGame() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = true;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = true;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = false;
    // The board has to be on screen before the clock starts, so the player
    // does not lose the first seconds of the run to a scroll.
    scrollGameIntoView(__classPrivateFieldGet(this, _App_boardRoot, "f"));
    __classPrivateFieldGet(this, _App_engine, "f").start();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_startTimer).call(this);
}, _App_restart = function _App_restart() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = false;
    __classPrivateFieldGet(this, _App_playButton, "f").disabled = false;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = true;
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_newAttempt = function _App_newAttempt() {
    __classPrivateFieldGet(this, _App_board, "f").unmount();
    __classPrivateFieldSet(this, _App_level, createLevel(__classPrivateFieldGet(this, _App_levelId, "f"), createCryptoRandom()), "f");
    __classPrivateFieldSet(this, _App_deal, buildDeal(__classPrivateFieldGet(this, _App_level, "f"), createCryptoRandom()), "f");
    __classPrivateFieldSet(this, _App_engine, new GameEngine(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), () => Date.now()), "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_bindEngine).call(this);
    __classPrivateFieldGet(this, _App_board, "f").mount(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), __classPrivateFieldGet(this, _App_engine, "f"));
}, _App_selectLevel = function _App_selectLevel(levelId) {
    __classPrivateFieldSet(this, _App_levelId, levelId, "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
}, _App_goToNextLevel = function _App_goToNextLevel() {
    const nextId = __classPrivateFieldGet(this, _App_instances, "m", _App_nextLevelId).call(this);
    if (nextId === null) {
        __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
        return;
    }
    __classPrivateFieldSet(this, _App_levelId, nextId, "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
    __classPrivateFieldGet(this, _App_playButton, "f").focus();
}, _App_openOrderPopup = function _App_openOrderPopup() {
    if (!__classPrivateFieldGet(this, _App_engine, "f").openOrderPopup()) {
        return;
    }
    __classPrivateFieldGet(this, _App_status, "f").show({
        text: "The order is open. The clock keeps running.",
        tone: "warning",
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_closeOrderPopup = function _App_closeOrderPopup() {
    const charged = __classPrivateFieldGet(this, _App_engine, "f").closeOrderPopup();
    if (charged > 0) {
        __classPrivateFieldGet(this, _App_status, "f").show({
            text: `Closed. Looking at the order cost ${charged} point${charged === 1 ? "" : "s"}.`,
            tone: "warning",
        });
    }
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_startTimer = function _App_startTimer() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldSet(this, _App_timerHandle, window.setInterval(() => {
        __classPrivateFieldGet(this, _App_engine, "f").tick();
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    }, TICK_INTERVAL_MS), "f");
}, _App_stopTimer = function _App_stopTimer() {
    if (__classPrivateFieldGet(this, _App_timerHandle, "f") !== null) {
        window.clearInterval(__classPrivateFieldGet(this, _App_timerHandle, "f"));
        __classPrivateFieldSet(this, _App_timerHandle, null, "f");
    }
    if (__classPrivateFieldGet(this, _App_lingerHandle, "f") !== null) {
        window.clearTimeout(__classPrivateFieldGet(this, _App_lingerHandle, "f"));
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
    }
}, _App_scheduleLingerHide = function _App_scheduleLingerHide() {
    if (__classPrivateFieldGet(this, _App_lingerHandle, "f") !== null) {
        window.clearTimeout(__classPrivateFieldGet(this, _App_lingerHandle, "f"));
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
    }
    const hideAfterMs = __classPrivateFieldGet(this, _App_engine, "f").getState().lingerHideAfterMs;
    if (hideAfterMs === null) {
        return;
    }
    const delay = Math.max(0, hideAfterMs - Date.now());
    __classPrivateFieldSet(this, _App_lingerHandle, window.setTimeout(() => {
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
        __classPrivateFieldGet(this, _App_engine, "f").tick();
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    }, delay), "f");
}, _App_handleEngineEvent = function _App_handleEngineEvent(event) {
    if (event.type === "flip") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleFlipOutcome).call(this, event.outcome);
    }
    if (event.type === "won") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleWin).call(this);
    }
    if (event.type === "failed") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleFail).call(this);
    }
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_scheduleLingerHide).call(this);
}, _App_handleFlipOutcome = function _App_handleFlipOutcome(outcome) {
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    if (state.phase === "Win" || state.phase === "Failed") {
        return;
    }
    const message = statusForOutcome(outcome, __classPrivateFieldGet(this, _App_deal, "f"), unitNoun(__classPrivateFieldGet(this, _App_level, "f")));
    if (message !== null) {
        __classPrivateFieldGet(this, _App_status, "f").show(message);
    }
}, _App_handleWin = function _App_handleWin() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_board, "f").revealAll();
    __classPrivateFieldGet(this, _App_status, "f").show({ text: "Perfect run. You won the level.", tone: "good" });
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_screens, "f").showWin(state, __classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_instances, "m", _App_nextLevelId).call(this) !== null);
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordHistory).call(this, state, true);
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordStats).call(this, state, true);
}, _App_handleFail = function _App_handleFail() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_board, "f").revealAll();
    __classPrivateFieldGet(this, _App_status, "f").show({ text: "Out of time. The attempt failed.", tone: "warning" });
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_screens, "f").showFail(state, __classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordHistory).call(this, state, false);
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordStats).call(this, state, false);
}, _App_recordStats = function _App_recordStats(state, won) {
    const result = __classPrivateFieldGet(this, _App_statsStore, "f").record(__classPrivateFieldGet(this, _App_level, "f").id, {
        score: state.score,
        timeMs: state.elapsedMs,
        won,
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    if (!won) {
        return;
    }
    if (result.isNewBestScore || result.isNewBestTime) {
        fireConfetti().catch(() => undefined);
    }
}, _App_renderStats = function _App_renderStats() {
    __classPrivateFieldGet(this, _App_stats, "f").render(__classPrivateFieldGet(this, _App_statsStore, "f").statsFor(__classPrivateFieldGet(this, _App_level, "f").id));
}, _App_recordHistory = function _App_recordHistory(state, won) {
    __classPrivateFieldGet(this, _App_historyStore, "f").record({
        levelId: __classPrivateFieldGet(this, _App_level, "f").id,
        timeMs: state.elapsedMs,
        score: state.score,
        playedAtMs: Date.now(),
        progress: state.completedUnitIds.length,
        unitCount: state.unitCount,
        won,
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
}, _App_renderHistory = function _App_renderHistory() {
    __classPrivateFieldGet(this, _App_history, "f").render(__classPrivateFieldGet(this, _App_historyStore, "f").list());
}, _App_clearHistory = function _App_clearHistory() {
    __classPrivateFieldGet(this, _App_historyStore, "f").clear();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
}, _App_nextLevelId = function _App_nextLevelId() {
    const currentIndex = LEVEL_OPTIONS.findIndex((option) => option.id === __classPrivateFieldGet(this, _App_levelId, "f"));
    const next = LEVEL_OPTIONS[currentIndex + 1];
    return next === undefined ? null : next.id;
}, _App_renderHud = function _App_renderHud() {
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_hud, "f").render(state, __classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderOrder).call(this, state);
    // The reveal button is rendered before the popup, because the popup hands
    // the focus back to that button when it closes, and a disabled button
    // cannot take the focus.
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderRevealButton).call(this, state);
    __classPrivateFieldGet(this, _App_orderPopup, "f").render(state, __classPrivateFieldGet(this, _App_deal, "f"));
}, _App_renderOrder = function _App_renderOrder(state) {
    if (!__classPrivateFieldGet(this, _App_instances, "m", _App_showsOrderStrip).call(this, state)) {
        __classPrivateFieldGet(this, _App_order, "f").hide();
        return;
    }
    __classPrivateFieldGet(this, _App_order, "f").render(state, __classPrivateFieldGet(this, _App_deal, "f"));
}, _App_showsOrderStrip = function _App_showsOrderStrip(state) {
    const rule = __classPrivateFieldGet(this, _App_level, "f").orderPopup;
    if (rule === null) {
        return true;
    }
    if (rule.kind === "metered") {
        return false;
    }
    return state.completedUnitIds.length < rule.stripRetireAfterPairs;
}, _App_renderRevealButton = function _App_renderRevealButton(state) {
    const rule = __classPrivateFieldGet(this, _App_level, "f").orderPopup;
    const popupOpen = state.popup?.open === true;
    const gameOver = state.phase === "Win" || state.phase === "Failed";
    const notStarted = state.phase === "Idle";
    const available = rule !== null && !popupOpen && !gameOver && !notStarted;
    __classPrivateFieldGet(this, _App_revealButton, "f").hidden = rule === null;
    __classPrivateFieldGet(this, _App_revealButton, "f").disabled = !available;
};

return { App: App };
})();

// ui/shell.js
const m_ui_shell_js = (function (createElement = m_ui_dom_js.createElement) {
function buildShell(root, options = {}) {
    const showTitle = options.showTitle ?? true;
    root.classList.add("nag-shell");
    const header = createElement("header", "nag-header");
    const title = showTitle ? createElement("h1", "nag-title", "nAG") : null;
    const tagline = createElement("p", "nag-tagline", "Game that nags 'Make no mistakes'. Scout the board, train memory, deliver unbroken streak to win. So hardcore it's annoying-good.");
    header.append(...(title === null ? [] : [title]), tagline);
    const instructions = createElement("section", "nag-instructions-region");
    instructions.setAttribute("aria-label", "How to play");
    const hud = createElement("section", "nag-hud-region");
    hud.setAttribute("aria-label", "Game status");
    const stats = createElement("section", "nag-stats-region");
    stats.setAttribute("aria-label", "Your record for this level");
    const status = createElement("section", "nag-status-region");
    status.setAttribute("aria-label", "Latest message");
    const order = createElement("section", "nag-order-region");
    order.setAttribute("aria-label", "Order to play");
    const orderPopup = createElement("section", "nag-order-popup-region");
    orderPopup.setAttribute("aria-label", "The order to play");
    const board = createElement("section", "nag-board-region");
    board.setAttribute("aria-label", "Card board");
    const reveal = createElement("section", "nag-reveal-region");
    reveal.setAttribute("aria-label", "Reveal the order");
    const controls = createElement("section", "nag-controls-region");
    const screen = createElement("section", "nag-screen-region");
    screen.setAttribute("aria-label", "Result");
    const history = createElement("section", "nag-history-region");
    history.setAttribute("aria-label", "Previous games");
    root.replaceChildren(header, instructions, hud, stats, status, order, orderPopup, board, reveal, controls, screen, history);
    return {
        title,
        instructions,
        hud,
        stats,
        status,
        order,
        orderPopup,
        board,
        reveal,
        controls,
        screen,
        history,
    };
}

return { buildShell: buildShell };
})();

// main.js
const m_main_js = (function (GAME_NAME = m_version_js.GAME_NAME, GAME_VERSION = m_version_js.GAME_VERSION, App = m_ui_app_js.App, buildShell = m_ui_shell_js.buildShell) {



/**
 * The container the game mounts into. The site page carries its own heading
 * for the game, so the game fills the container without a title of its own.
 */
const MOUNT_SELECTOR = "#nag-app";
const app = document.querySelector(MOUNT_SELECTOR);
if (app instanceof HTMLElement) {
    app.setAttribute("data-game", GAME_NAME);
    app.setAttribute("data-version", GAME_VERSION);
    // A page that is only the game asks for the title, because there is no
    // heading anywhere else on it. The site page brings its own.
    const showTitle = app.getAttribute("data-show-title") === "true";
    const shell = buildShell(app, { showTitle: showTitle });
    new App(shell);
}

return {  };
})();
