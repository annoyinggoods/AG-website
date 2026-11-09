import { countPieces } from "./board.js";
export const points = {
    pawnKill: 1,
    kingKill: 2,
    frenzyOpenBonus: 2,
    queenBuffBonus: 3,
    wipeoutWin: 10,
    blockageWin: 10,
};
export const ENDGAME_ROUNDS = 20;
export function emptyScores() {
    return { white: 0, purple: 0 };
}
export function emptyRoundTurns() {
    return { white: false, purple: false };
}
export function onePieceCondition(board) {
    return countPieces(board, "white") === 1 || countPieces(board, "purple") === 1;
}
export function scoreRemoval(state, scorer, victim) {
    const earned = victimPoints(state, victim);
    const scores = raiseScore(state.scores, scorer, earned);
    const kills = raiseScore(state.kills, scorer, 1);
    const updated = {
        ...state,
        scores,
        kills,
        endgameRounds: 0,
        roundHadKill: true,
        endgameCounting: onePieceCondition(state.board),
    };
    return { state: updated, event: { type: "score", player: scorer, delta: earned, scores } };
}
export function scoreFlatBonus(state, scorer, amount) {
    const scores = raiseScore(state.scores, scorer, amount);
    const updated = { ...state, scores };
    return { state: updated, event: { type: "score", player: scorer, delta: amount, scores } };
}
export function standingOf(scores) {
    if (scores.white > scores.purple) {
        return "white";
    }
    if (scores.purple > scores.white) {
        return "purple";
    }
    return "tie";
}
export function withFinalResult(state, reason, winner) {
    const standing = winner === null ? "tie" : winner;
    const result = {
        winner: standing,
        reason,
        scores: { ...state.scores },
        kills: { ...state.kills },
    };
    return { ...state, result };
}
function victimPoints(state, victim) {
    let earned = victim.kind === "king" ? points.kingKill : points.pawnKill;
    if (carriesQueenBuff(state, victim)) {
        earned += points.queenBuffBonus;
    }
    else if (diesInOpenFrenzy(state, victim)) {
        earned += points.frenzyOpenBonus;
    }
    return earned;
}
function carriesQueenBuff(state, victim) {
    return state.empowerment.activeBuffs.some((buff) => buff.pieceId === victim.id && !buff.moved);
}
function diesInOpenFrenzy(state, victim) {
    return victim.kind === "pawn" && state.empowerment.frenzyOpenPlayers.includes(victim.player);
}
function raiseScore(pair, player, amount) {
    if (player === "white") {
        return { ...pair, white: pair.white + amount };
    }
    return { ...pair, purple: pair.purple + amount };
}
//# sourceMappingURL=scoring.js.map