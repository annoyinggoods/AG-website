export const BOARD_SIZE = 8;
export const PURPLE_START_ROWS = [0, 1, 2];
export const WHITE_START_ROWS = [5, 6, 7];
export const DIAGONALS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
];
export function inBounds(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
}
export function isDark(row, column) {
    return (row + column) % 2 === 1;
}
export function forwardStep(player) {
    return player === "white" ? -1 : 1;
}
export function opponentOf(player) {
    return player === "white" ? "purple" : "white";
}
export function sameSquare(left, right) {
    return left.row === right.row && left.column === right.column;
}
export function emptyBoard() {
    const board = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        const cells = [];
        for (let column = 0; column < BOARD_SIZE; column += 1) {
            cells.push(null);
        }
        board.push(cells);
    }
    return board;
}
export function initialBoard() {
    const board = emptyBoard();
    let id = 1;
    for (const row of PURPLE_START_ROWS) {
        id = placeRow(board, row, "purple", id);
    }
    for (const row of WHITE_START_ROWS) {
        id = placeRow(board, row, "white", id);
    }
    return board;
}
export function placeRow(board, row, player, startId) {
    let id = startId;
    for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (!isDark(row, column)) {
            continue;
        }
        placePiece(board, { row, column }, { player, kind: "pawn", id });
        id += 1;
    }
    return id;
}
export function placePiece(board, square, piece) {
    checkedRow(board, square)[square.column] = piece;
}
export function clearSquare(board, square) {
    checkedRow(board, square)[square.column] = null;
}
export function pieceAt(board, square) {
    const row = rowAt(board, square.row);
    if (!row) {
        return null;
    }
    return row[square.column] ?? null;
}
export function clonePiece(piece) {
    return { player: piece.player, kind: piece.kind, id: piece.id };
}
export function cloneBoard(board) {
    return board.map((row) => row.map((piece) => (piece === null ? null : clonePiece(piece))));
}
export function countPieces(board, player) {
    let total = 0;
    for (const row of board) {
        for (const piece of row) {
            if (piece !== null && piece.player === player) {
                total += 1;
            }
        }
    }
    return total;
}
export function wipeoutWinner(board) {
    const white = countPieces(board, "white");
    const purple = countPieces(board, "purple");
    if (white === 0 && purple === 0) {
        return null;
    }
    if (white === 0) {
        return "purple";
    }
    if (purple === 0) {
        return "white";
    }
    return null;
}
export function piecesOf(board, player) {
    const pieces = [];
    for (const square of squaresWithPieces(board, player)) {
        const piece = pieceAt(board, square);
        if (piece !== null) {
            pieces.push(clonePiece(piece));
        }
    }
    return pieces;
}
export function squareOfPiece(board, pieceId) {
    for (const square of squaresWithPieces(board, "white")) {
        if (pieceAt(board, square)?.id === pieceId) {
            return square;
        }
    }
    for (const square of squaresWithPieces(board, "purple")) {
        if (pieceAt(board, square)?.id === pieceId) {
            return square;
        }
    }
    return null;
}
export function diagonalSteps(rowSteps) {
    const steps = [];
    for (const rowStep of rowSteps) {
        steps.push([rowStep, -1], [rowStep, 1]);
    }
    return steps;
}
export function walkRay(board, from, rowStep, columnStep) {
    const empties = [];
    let row = from.row + rowStep;
    let column = from.column + columnStep;
    while (inBounds(row, column)) {
        const square = { row, column };
        if (pieceAt(board, square) !== null) {
            return { empties, blocker: square };
        }
        empties.push(square);
        row += rowStep;
        column += columnStep;
    }
    return { empties, blocker: null };
}
export function squaresWithPieces(board, player) {
    const squares = [];
    for (let row = 0; row < board.length; row += 1) {
        for (let column = 0; column < board.length; column += 1) {
            const piece = pieceAt(board, { row, column });
            if (piece !== null && piece.player === player) {
                squares.push({ row, column });
            }
        }
    }
    return squares;
}
function rowAt(board, row) {
    return board[row];
}
function checkedRow(board, square) {
    const row = rowAt(board, square.row);
    if (row === undefined || square.column < 0 || square.column >= BOARD_SIZE) {
        throw new Error(`square ${square.row},${square.column} is outside the board`);
    }
    return row;
}
//# sourceMappingURL=board.js.map