import { DIAGONALS, diagonalSteps, forwardStep, inBounds, pieceAt, walkRay } from "./board.js";
import { kingModeFor } from "./kingmode.js";
import { uniqueMoves } from "./moveset.js";
export function quietMovesFor(board, from, piece, context) {
    if (context.buffedPieceIds.includes(piece.id)) {
        return flyingKingQuietMoves(board, from);
    }
    if (piece.kind === "pawn") {
        return pawnQuietMoves(board, from, piece, context);
    }
    if (kingModeFor(context.rules) === "flying") {
        return flyingKingQuietMoves(board, from);
    }
    return englishKingQuietMoves(board, from);
}
export function pawnQuietMoves(board, from, piece, context) {
    if (context.frenzyTurn) {
        const hops = frenzyPawnQuietMoves(board, from);
        if (!context.rules.forcedFullSlide) {
            return hops;
        }
        return uniqueMoves([...hops, ...slidePawnQuietMoves(board, from, piece)]);
    }
    if (context.rules.forcedFullSlide) {
        return slidePawnQuietMoves(board, from, piece);
    }
    return oneStepMoves(board, from, diagonalSteps(pawnStepDirections(piece, context.rules)));
}
export function pawnStepDirections(piece, rules) {
    if (rules.fourDirectionStepping) {
        return [-1, 1];
    }
    return [forwardStep(piece.player)];
}
export function englishKingQuietMoves(board, from) {
    return oneStepMoves(board, from, DIAGONALS);
}
export function flyingKingQuietMoves(board, from) {
    const moves = [];
    for (const [rowStep, columnStep] of DIAGONALS) {
        for (const square of walkRay(board, from, rowStep, columnStep).empties) {
            moves.push(quietMove(from, square));
        }
    }
    return moves;
}
export function frenzyPawnQuietMoves(board, from) {
    const moves = [];
    for (const [rowStep, columnStep] of DIAGONALS) {
        const firstStep = { row: from.row + rowStep, column: from.column + columnStep };
        if (!inBounds(firstStep.row, firstStep.column) || pieceAt(board, firstStep) !== null) {
            continue;
        }
        moves.push(quietMove(from, firstStep));
        const secondStep = { row: from.row + rowStep * 2, column: from.column + columnStep * 2 };
        if (inBounds(secondStep.row, secondStep.column) && pieceAt(board, secondStep) === null) {
            moves.push(quietMove(from, secondStep));
        }
    }
    return moves;
}
export function slidePawnQuietMoves(board, from, piece) {
    const moves = [];
    for (const [rowStep, columnStep] of diagonalSteps([forwardStep(piece.player)])) {
        const stop = slideStop(board, from, piece, rowStep, columnStep);
        if (stop !== null) {
            moves.push(quietMove(from, stop));
        }
    }
    return moves;
}
export function quietMove(from, to) {
    return { from: { ...from }, to: { ...to }, kind: "quiet", kills: [] };
}
function slideStop(board, from, piece, rowStep, columnStep) {
    const walk = walkRay(board, from, rowStep, columnStep);
    if (walk.blocker !== null) {
        const blocker = pieceAt(board, walk.blocker);
        if (blocker === null || blocker.player !== piece.player) {
            return null;
        }
    }
    return walk.empties[walk.empties.length - 1] ?? null;
}
function oneStepMoves(board, from, steps) {
    const moves = [];
    for (const [rowStep, columnStep] of steps) {
        const to = { row: from.row + rowStep, column: from.column + columnStep };
        if (!inBounds(to.row, to.column)) {
            continue;
        }
        if (pieceAt(board, to) !== null) {
            continue;
        }
        moves.push(quietMove(from, to));
    }
    return moves;
}
//# sourceMappingURL=moves.js.map