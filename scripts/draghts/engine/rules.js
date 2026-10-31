import { kingModeFor } from "./kingmode.js";
export function baseRules() {
    return {
        beatAnyDirection: false,
        missKillPunishment: false,
        fourDirectionStepping: false,
        forcedFullSlide: false,
        killLink: false,
        extraTurnBonus: false,
        queenBuff: false,
        killFrenzy: false,
    };
}
export function rulesWith(overrides) {
    return { ...baseRules(), ...overrides };
}
export function kingMode(config) {
    return kingModeFor(config);
}
export function validateRules(config) {
    const corrected = { ...config };
    const corrections = [];
    enableKillLink(corrected, corrections);
    resolveSteppingConflict(corrected, corrections);
    return { config: corrected, corrections };
}
function enableKillLink(config, corrections) {
    if (config.killLink) {
        return;
    }
    const needing = [];
    if (config.extraTurnBonus) {
        needing.push(6);
    }
    if (config.queenBuff) {
        needing.push(7);
    }
    if (needing.length === 0) {
        return;
    }
    config.killLink = true;
    corrections.push({
        rule: 5,
        action: "enabled",
        reason: `${ruleNames(needing)} need rule 5 (kill link) to count the kills of a chain, so rule 5 was turned on.`,
    });
}
function resolveSteppingConflict(config, corrections) {
    if (!config.fourDirectionStepping || !config.forcedFullSlide) {
        return;
    }
    config.fourDirectionStepping = false;
    corrections.push({
        rule: 3,
        action: "disabled",
        reason: "Rules 3 and 4 cannot both be on, so rule 4 was left on and rule 3 was turned off.",
    });
}
function ruleNames(numbers) {
    const joined = numbers.join(" and ");
    if (numbers.length === 1) {
        return `Rule ${joined}`;
    }
    return `Rules ${joined}`;
}
//# sourceMappingURL=rules.js.map