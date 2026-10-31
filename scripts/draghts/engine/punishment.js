import { clearSquare, cloneBoard, clonePiece, pieceAt, piecesOf, squareOfPiece } from "./board.js";
import { endOfTurn } from "./turn.js";
import { scoreRemoval } from "./scoring.js";
export const victimTierRank = {
    flying: 3,
    frenzy: 2,
    plain: 1,
};
export function punishmentCandidates(state) {
    const pending = state.pendingPunishment;
    if (pending === null) {
        return [];
    }
    return piecesOf(state.board, pending.victimPlayer);
}
export function applyPunishment(state, victimId) {
    if (state.status === "ended") {
        throw new Error("the game has already ended");
    }
    const pending = state.pendingPunishment;
    if (pending === null) {
        throw new Error("there is no punishment to apply");
    }
    const square = squareOfPiece(state.board, victimId);
    if (square === null) {
        throw new Error("there is no piece with that id on the board");
    }
    const victim = pieceAt(state.board, square);
    if (victim === null || victim.player !== pending.victimPlayer) {
        throw new Error("the victim does not belong to the punished player");
    }
    const board = cloneBoard(state.board);
    clearSquare(board, square);
    const events = [];
    events.push({
        type: "punish",
        player: state.turn,
        victim: clonePiece(victim),
        victimSquare: { ...square },
    });
    const outcome = scoreRemoval({ ...state, board }, state.turn, victim);
    events.push(outcome.event);
    const cleared = { ...outcome.state, pendingPunishment: null };
    return endOfTurn(cleared, pending.victimPlayer, null, events);
}
export function pickVictim(state, rng) {
    const candidates = punishmentCandidates(state);
    if (candidates.length === 0) {
        return null;
    }
    const tied = bestTierCandidates(state, candidates);
    const moved = tied.filter((piece) => moveOrderOf(state, piece.id) !== null);
    if (moved.length > 0) {
        return mostRecentlyMoved(state, moved);
    }
    const index = Math.min(tied.length - 1, Math.floor(rng() * tied.length));
    return tied[index] ?? null;
}
export function victimTier(state, piece) {
    if (piece.kind === "king") {
        return "flying";
    }
    if (state.empowerment.activeBuffs.some((buff) => buff.pieceId === piece.id)) {
        return "flying";
    }
    if (state.empowerment.frenzyOpenPlayers.includes(piece.player)) {
        return "frenzy";
    }
    return "plain";
}
export function moveOrderOf(state, pieceId) {
    const order = state.lastMoveOrder[String(pieceId)];
    return order === undefined ? null : order;
}
function bestTierCandidates(state, candidates) {
    let best = victimTierRank.plain;
    for (const piece of candidates) {
        best = Math.max(best, victimTierRank[victimTier(state, piece)]);
    }
    return candidates.filter((piece) => victimTierRank[victimTier(state, piece)] === best);
}
function mostRecentlyMoved(state, pieces) {
    const first = pieces[0];
    if (first === undefined) {
        throw new Error("there is no victim to pick");
    }
    let best = first;
    let bestOrder = moveOrderOf(state, best.id) ?? 0;
    for (const piece of pieces) {
        const order = moveOrderOf(state, piece.id) ?? 0;
        if (order > bestOrder) {
            best = piece;
            bestOrder = order;
        }
    }
    return best;
}
//# sourceMappingURL=punishment.js.map