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
import { countPassedMarks } from "../engine/timer-model.js";
import { createElement, setText } from "./dom.js";
import { formatCountdown, formatSeconds } from "./format.js";
import { unitNoun } from "./instructions.js";
const ACTIVE_PHASES = ["Scout", "Linger", "Run"];
export class HudUI {
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
//# sourceMappingURL=hud.js.map