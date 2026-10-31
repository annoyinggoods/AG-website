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
export class Score {
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
//# sourceMappingURL=scoring.js.map