export function kingModeFor(rules) {
    if (rules.forcedFullSlide || rules.queenBuff || rules.killFrenzy) {
        return "flying";
    }
    return "english";
}
//# sourceMappingURL=kingmode.js.map