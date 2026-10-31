export function moveContextFor(state, player) {
    return {
        rules: state.rules,
        frenzyTurn: isFrenzyTurnFor(state, player),
        buffedPieceIds: state.empowerment.activeBuffs.map((buff) => buff.pieceId),
    };
}
function isFrenzyTurnFor(state, player) {
    if (!state.rules.killFrenzy) {
        return false;
    }
    if (player !== state.turn) {
        return false;
    }
    return state.frenzyTurn;
}
//# sourceMappingURL=context.js.map