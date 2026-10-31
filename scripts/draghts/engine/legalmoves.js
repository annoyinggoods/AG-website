import { moveContextFor } from "./context.js";
import { pieceAt, squaresWithPieces } from "./board.js";
import { quietMovesFor } from "./moves.js";
import { captureMovesFor } from "./captures.js";
export function movesForPlayer(state, player) {
    const context = moveContextFor(state, player);
    const moves = [];
    for (const square of squaresWithPieces(state.board, player)) {
        const piece = pieceAt(state.board, square);
        if (piece === null) {
            continue;
        }
        moves.push(...captureMovesFor(state.board, square, piece, context));
        moves.push(...quietMovesFor(state.board, square, piece, context));
    }
    return moves;
}
export function hasAnyMove(state, player) {
    return movesForPlayer(state, player).length > 0;
}
//# sourceMappingURL=legalmoves.js.map