// engine/board.js
var m_engine_board_js = (function () {
const BOARD_SIZE = 8;
const PURPLE_START_ROWS = [0, 1, 2];
const WHITE_START_ROWS = [5, 6, 7];
const DIAGONALS = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
];
function inBounds(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
}
function isDark(row, column) {
    return (row + column) % 2 === 1;
}
function forwardStep(player) {
    return player === "white" ? -1 : 1;
}
function opponentOf(player) {
    return player === "white" ? "purple" : "white";
}
function sameSquare(left, right) {
    return left.row === right.row && left.column === right.column;
}
function emptyBoard() {
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
function initialBoard() {
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
function placeRow(board, row, player, startId) {
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
function placePiece(board, square, piece) {
    checkedRow(board, square)[square.column] = piece;
}
function clearSquare(board, square) {
    checkedRow(board, square)[square.column] = null;
}
function pieceAt(board, square) {
    const row = rowAt(board, square.row);
    if (!row) {
        return null;
    }
    return row[square.column] ?? null;
}
function clonePiece(piece) {
    return { player: piece.player, kind: piece.kind, id: piece.id };
}
function cloneBoard(board) {
    return board.map((row) => row.map((piece) => (piece === null ? null : clonePiece(piece))));
}
function countPieces(board, player) {
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
function wipeoutWinner(board) {
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
function piecesOf(board, player) {
    const pieces = [];
    for (const square of squaresWithPieces(board, player)) {
        const piece = pieceAt(board, square);
        if (piece !== null) {
            pieces.push(clonePiece(piece));
        }
    }
    return pieces;
}
function squareOfPiece(board, pieceId) {
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
function diagonalSteps(rowSteps) {
    const steps = [];
    for (const rowStep of rowSteps) {
        steps.push([rowStep, -1], [rowStep, 1]);
    }
    return steps;
}
function walkRay(board, from, rowStep, columnStep) {
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
function squaresWithPieces(board, player) {
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

return { BOARD_SIZE: BOARD_SIZE, PURPLE_START_ROWS: PURPLE_START_ROWS, WHITE_START_ROWS: WHITE_START_ROWS, DIAGONALS: DIAGONALS, inBounds: inBounds, isDark: isDark, forwardStep: forwardStep, opponentOf: opponentOf, sameSquare: sameSquare, emptyBoard: emptyBoard, initialBoard: initialBoard, placeRow: placeRow, placePiece: placePiece, clearSquare: clearSquare, pieceAt: pieceAt, clonePiece: clonePiece, cloneBoard: cloneBoard, countPieces: countPieces, wipeoutWinner: wipeoutWinner, piecesOf: piecesOf, squareOfPiece: squareOfPiece, diagonalSteps: diagonalSteps, walkRay: walkRay, squaresWithPieces: squaresWithPieces };
})();

// engine/kingmode.js
var m_engine_kingmode_js = (function () {
function kingModeFor(rules) {
    if (rules.forcedFullSlide || rules.queenBuff || rules.killFrenzy) {
        return "flying";
    }
    return "english";
}

return { kingModeFor: kingModeFor };
})();

// engine/rules.js
var m_engine_rules_js = (function (kingModeFor = m_engine_kingmode_js.kingModeFor) {
function baseRules() {
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
function rulesWith(overrides) {
    return { ...baseRules(), ...overrides };
}
function kingMode(config) {
    return kingModeFor(config);
}
function validateRules(config) {
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

return { baseRules: baseRules, rulesWith: rulesWith, kingMode: kingMode, validateRules: validateRules };
})();

// engine/moveset.js
var m_engine_moveset_js = (function () {
function moveKey(move) {
    return [
        move.from.row,
        move.from.column,
        move.to.row,
        move.to.column,
        move.kind,
    ].join(",");
}
function uniqueMoves(moves) {
    const seen = new Set();
    const unique = [];
    for (const move of moves) {
        const key = moveKey(move);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(move);
    }
    return unique;
}

return { moveKey: moveKey, uniqueMoves: uniqueMoves };
})();

// engine/captures.js
var m_engine_captures_js = (function (DIAGONALS = m_engine_board_js.DIAGONALS, diagonalSteps = m_engine_board_js.diagonalSteps, forwardStep = m_engine_board_js.forwardStep, inBounds = m_engine_board_js.inBounds, pieceAt = m_engine_board_js.pieceAt, squaresWithPieces = m_engine_board_js.squaresWithPieces, walkRay = m_engine_board_js.walkRay, kingModeFor = m_engine_kingmode_js.kingModeFor, uniqueMoves = m_engine_moveset_js.uniqueMoves) {
function captureMovesFor(board, from, piece, context) {
    if (context.buffedPieceIds.includes(piece.id)) {
        return flyingKingCaptures(board, from, piece);
    }
    if (piece.kind === "pawn") {
        return pawnCaptures(board, from, piece, context);
    }
    if (kingModeFor(context.rules) === "flying") {
        const jumps = flyingKingCaptures(board, from, piece);
        if (!context.rules.forcedFullSlide) {
            return jumps;
        }
        return [...jumps, ...kingReplacementCaptures(board, from, piece)];
    }
    return englishKingCaptures(board, from, piece);
}
function pawnCaptures(board, from, piece, context) {
    if (context.frenzyTurn) {
        const hops = frenzyPawnCaptures(board, from, piece);
        if (!context.rules.forcedFullSlide) {
            return hops;
        }
        return uniqueMoves([...hops, ...replacementCaptures(board, from, piece)]);
    }
    if (context.rules.forcedFullSlide) {
        return replacementCaptures(board, from, piece);
    }
    return oneStepCaptures(board, from, piece, diagonalSteps(pawnCaptureDirections(piece, context.rules)));
}
function pawnCaptureDirections(piece, rules) {
    if (rules.beatAnyDirection) {
        return [-1, 1];
    }
    return [forwardStep(piece.player)];
}
function captureAvailableFor(board, player, context) {
    for (const square of squaresWithPieces(board, player)) {
        const piece = pieceAt(board, square);
        if (piece === null) {
            continue;
        }
        if (captureMovesFor(board, square, piece, context).length > 0) {
            return true;
        }
    }
    return false;
}
function frenzyPawnCaptures(board, from, piece) {
    return oneStepCaptures(board, from, piece, DIAGONALS);
}
function replacementCaptures(board, from, piece) {
    const moves = [];
    for (const [rowStep, columnStep] of diagonalSteps([forwardStep(piece.player)])) {
        const walk = walkRay(board, from, rowStep, columnStep);
        if (walk.blocker === null) {
            continue;
        }
        const blocker = pieceAt(board, walk.blocker);
        if (blocker === null || blocker.player === piece.player) {
            continue;
        }
        moves.push(captureMove({ from: { ...from }, victim: { ...walk.blocker }, landing: { ...walk.blocker } }));
    }
    return moves;
}
function kingReplacementCaptures(board, from, piece) {
    const moves = [];
    for (const [rowStep, columnStep] of DIAGONALS) {
        const walk = walkRay(board, from, rowStep, columnStep);
        if (walk.blocker === null) {
            continue;
        }
        const blocker = pieceAt(board, walk.blocker);
        if (blocker === null || blocker.player === piece.player) {
            continue;
        }
        moves.push(captureMove({ from: { ...from }, victim: { ...walk.blocker }, landing: { ...walk.blocker } }));
    }
    return moves;
}
function englishKingCaptures(board, from, piece) {
    return oneStepCaptures(board, from, piece, DIAGONALS);
}
function flyingKingCaptures(board, from, piece) {
    const moves = [];
    for (const [rowStep, columnStep] of DIAGONALS) {
        const walk = walkRay(board, from, rowStep, columnStep);
        if (walk.blocker === null) {
            continue;
        }
        const jump = {
            from: { ...from },
            victim: { ...walk.blocker },
            landing: { row: walk.blocker.row + rowStep, column: walk.blocker.column + columnStep },
        };
        const capture = jumpCapture(board, piece, jump);
        if (capture !== null) {
            moves.push(capture);
        }
    }
    return moves;
}
function jumpCapture(board, piece, jump) {
    if (!inBounds(jump.victim.row, jump.victim.column)) {
        return null;
    }
    const victimPiece = pieceAt(board, jump.victim);
    if (victimPiece === null || victimPiece.player === piece.player) {
        return null;
    }
    if (!inBounds(jump.landing.row, jump.landing.column)) {
        return null;
    }
    if (pieceAt(board, jump.landing) !== null) {
        return null;
    }
    return captureMove(jump);
}
function captureMove(jump) {
    return {
        from: { ...jump.from },
        to: { ...jump.landing },
        kind: "capture",
        kills: [{ ...jump.victim }],
    };
}
function oneStepCaptures(board, from, piece, steps) {
    const moves = [];
    for (const [rowStep, columnStep] of steps) {
        const jump = {
            from: { ...from },
            victim: { row: from.row + rowStep, column: from.column + columnStep },
            landing: { row: from.row + rowStep * 2, column: from.column + columnStep * 2 },
        };
        const capture = jumpCapture(board, piece, jump);
        if (capture !== null) {
            moves.push(capture);
        }
    }
    return moves;
}

return { captureMovesFor: captureMovesFor, pawnCaptures: pawnCaptures, pawnCaptureDirections: pawnCaptureDirections, captureAvailableFor: captureAvailableFor, frenzyPawnCaptures: frenzyPawnCaptures, replacementCaptures: replacementCaptures, kingReplacementCaptures: kingReplacementCaptures, englishKingCaptures: englishKingCaptures, flyingKingCaptures: flyingKingCaptures, jumpCapture: jumpCapture, captureMove: captureMove };
})();

// engine/context.js
var m_engine_context_js = (function () {
function moveContextFor(state, player) {
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

return { moveContextFor: moveContextFor };
})();

// engine/moves.js
var m_engine_moves_js = (function (DIAGONALS = m_engine_board_js.DIAGONALS, diagonalSteps = m_engine_board_js.diagonalSteps, forwardStep = m_engine_board_js.forwardStep, inBounds = m_engine_board_js.inBounds, pieceAt = m_engine_board_js.pieceAt, walkRay = m_engine_board_js.walkRay, kingModeFor = m_engine_kingmode_js.kingModeFor, uniqueMoves = m_engine_moveset_js.uniqueMoves) {
function quietMovesFor(board, from, piece, context) {
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
function pawnQuietMoves(board, from, piece, context) {
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
function pawnStepDirections(piece, rules) {
    if (rules.fourDirectionStepping) {
        return [-1, 1];
    }
    return [forwardStep(piece.player)];
}
function englishKingQuietMoves(board, from) {
    return oneStepMoves(board, from, DIAGONALS);
}
function flyingKingQuietMoves(board, from) {
    const moves = [];
    for (const [rowStep, columnStep] of DIAGONALS) {
        for (const square of walkRay(board, from, rowStep, columnStep).empties) {
            moves.push(quietMove(from, square));
        }
    }
    return moves;
}
function frenzyPawnQuietMoves(board, from) {
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
function slidePawnQuietMoves(board, from, piece) {
    const moves = [];
    for (const [rowStep, columnStep] of diagonalSteps([forwardStep(piece.player)])) {
        const stop = slideStop(board, from, piece, rowStep, columnStep);
        if (stop !== null) {
            moves.push(quietMove(from, stop));
        }
    }
    return moves;
}
function quietMove(from, to) {
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

return { quietMovesFor: quietMovesFor, pawnQuietMoves: pawnQuietMoves, pawnStepDirections: pawnStepDirections, englishKingQuietMoves: englishKingQuietMoves, flyingKingQuietMoves: flyingKingQuietMoves, frenzyPawnQuietMoves: frenzyPawnQuietMoves, slidePawnQuietMoves: slidePawnQuietMoves, quietMove: quietMove };
})();

// engine/legalmoves.js
var m_engine_legalmoves_js = (function (moveContextFor = m_engine_context_js.moveContextFor, pieceAt = m_engine_board_js.pieceAt, squaresWithPieces = m_engine_board_js.squaresWithPieces, quietMovesFor = m_engine_moves_js.quietMovesFor, captureMovesFor = m_engine_captures_js.captureMovesFor) {
function movesForPlayer(state, player) {
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
function hasAnyMove(state, player) {
    return movesForPlayer(state, player).length > 0;
}

return { movesForPlayer: movesForPlayer, hasAnyMove: hasAnyMove };
})();

// engine/frenzy.js
var m_engine_frenzy_js = (function () {
function emptyFrenzy() {
    return {
        white: { streak: 0, armed: false },
        purple: { streak: 0, armed: false },
    };
}
function cloneFrenzy(frenzy) {
    return {
        white: { ...frenzy.white },
        purple: { ...frenzy.purple },
    };
}
function consumeArmedFrenzy(state) {
    const tracker = state.frenzy[state.turn];
    if (!tracker.armed) {
        return { ...state, frenzyTurn: false };
    }
    return {
        ...state,
        frenzyTurn: true,
        frenzy: withTracker(state.frenzy, state.turn, { streak: tracker.streak, armed: false }),
    };
}
function settleFrenzyStreak(state, mover) {
    if (!state.rules.killFrenzy) {
        return { state, armed: false };
    }
    const tracker = state.frenzy[mover];
    const streak = state.turnKills > 0 ? tracker.streak + 1 : 0;
    if (streak < 3) {
        const updated = {
            ...state,
            frenzy: withTracker(state.frenzy, mover, { streak, armed: tracker.armed }),
        };
        return { state: updated, armed: false };
    }
    const armed = {
        ...state,
        frenzy: withTracker(state.frenzy, mover, { streak: 0, armed: true }),
    };
    return { state: withOpenFrenzy(armed, mover), armed: true };
}
function closeFrenzyTurn(state, mover) {
    if (!state.frenzyTurn) {
        return state;
    }
    const closed = { ...state, frenzyTurn: false };
    if (closed.frenzy[mover].armed) {
        return closed;
    }
    return {
        ...closed,
        empowerment: {
            ...closed.empowerment,
            frenzyOpenPlayers: closed.empowerment.frenzyOpenPlayers.filter((player) => player !== mover),
        },
    };
}
function withTracker(frenzy, player, tracker) {
    return { ...frenzy, [player]: tracker };
}
function withOpenFrenzy(state, mover) {
    if (state.empowerment.frenzyOpenPlayers.includes(mover)) {
        return state;
    }
    return {
        ...state,
        empowerment: {
            ...state.empowerment,
            frenzyOpenPlayers: [...state.empowerment.frenzyOpenPlayers, mover],
        },
    };
}

return { emptyFrenzy: emptyFrenzy, cloneFrenzy: cloneFrenzy, consumeArmedFrenzy: consumeArmedFrenzy, settleFrenzyStreak: settleFrenzyStreak, closeFrenzyTurn: closeFrenzyTurn };
})();

// engine/bonuses.js
var m_engine_bonuses_js = (function () {
function resolveKillBonuses(state, mover, moverPieceId) {
    if (state.turnKills >= 3 && state.rules.queenBuff) {
        if (moverPieceId === null || !state.moverStartedAsPawn) {
            return { state, bonus: "none" };
        }
        return { state: armQueenBuff(state, mover, moverPieceId), bonus: "queenBuff" };
    }
    if (state.turnKills >= 2 && state.rules.extraTurnBonus) {
        return { state, bonus: "extraTurn" };
    }
    return { state, bonus: "none" };
}
function expireQueenBuffs(empowerment, mover, moveCounter) {
    const activeBuffs = empowerment.activeBuffs.filter((buff) => buff.owner !== mover || buff.armedTurn >= moveCounter);
    if (activeBuffs.length === empowerment.activeBuffs.length) {
        return empowerment;
    }
    return { ...empowerment, activeBuffs };
}
function armQueenBuff(state, owner, pieceId) {
    const armedTurn = state.moveCounter;
    const others = state.empowerment.activeBuffs.filter((buff) => buff.pieceId !== pieceId);
    const activeBuffs = [...others, { pieceId, armedTurn, owner, moved: false }];
    return { ...state, empowerment: { ...state.empowerment, activeBuffs } };
}
function markBuffMoved(state, pieceId) {
    const activeBuffs = state.empowerment.activeBuffs.map((buff) => buff.pieceId === pieceId ? { ...buff, moved: true } : buff);
    return { ...state, empowerment: { ...state.empowerment, activeBuffs } };
}

return { resolveKillBonuses: resolveKillBonuses, expireQueenBuffs: expireQueenBuffs, markBuffMoved: markBuffMoved };
})();

// engine/scoring.js
var m_engine_scoring_js = (function (countPieces = m_engine_board_js.countPieces) {
const points = {
    pawnKill: 1,
    kingKill: 2,
    frenzyOpenBonus: 2,
    queenBuffBonus: 3,
    wipeoutWin: 10,
    blockageWin: 10,
};
const ENDGAME_ROUNDS = 20;
function emptyScores() {
    return { white: 0, purple: 0 };
}
function emptyRoundTurns() {
    return { white: false, purple: false };
}
function onePieceCondition(board) {
    return countPieces(board, "white") === 1 || countPieces(board, "purple") === 1;
}
function scoreRemoval(state, scorer, victim) {
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
function scoreFlatBonus(state, scorer, amount) {
    const scores = raiseScore(state.scores, scorer, amount);
    const updated = { ...state, scores };
    return { state: updated, event: { type: "score", player: scorer, delta: amount, scores } };
}
function standingOf(scores) {
    if (scores.white > scores.purple) {
        return "white";
    }
    if (scores.purple > scores.white) {
        return "purple";
    }
    return "tie";
}
function withFinalResult(state, reason, winner) {
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

return { points: points, ENDGAME_ROUNDS: ENDGAME_ROUNDS, emptyScores: emptyScores, emptyRoundTurns: emptyRoundTurns, onePieceCondition: onePieceCondition, scoreRemoval: scoreRemoval, scoreFlatBonus: scoreFlatBonus, standingOf: standingOf, withFinalResult: withFinalResult };
})();

// engine/turn.js
var m_engine_turn_js = (function (opponentOf = m_engine_board_js.opponentOf, wipeoutWinner = m_engine_board_js.wipeoutWinner, captureAvailableFor = m_engine_captures_js.captureAvailableFor, moveContextFor = m_engine_context_js.moveContextFor, closeFrenzyTurn = m_engine_frenzy_js.closeFrenzyTurn, consumeArmedFrenzy = m_engine_frenzy_js.consumeArmedFrenzy, settleFrenzyStreak = m_engine_frenzy_js.settleFrenzyStreak, expireQueenBuffs = m_engine_bonuses_js.expireQueenBuffs, resolveKillBonuses = m_engine_bonuses_js.resolveKillBonuses, hasAnyMove = m_engine_legalmoves_js.hasAnyMove, ENDGAME_ROUNDS = m_engine_scoring_js.ENDGAME_ROUNDS, emptyRoundTurns = m_engine_scoring_js.emptyRoundTurns, onePieceCondition = m_engine_scoring_js.onePieceCondition, points = m_engine_scoring_js.points, scoreFlatBonus = m_engine_scoring_js.scoreFlatBonus, standingOf = m_engine_scoring_js.standingOf, withFinalResult = m_engine_scoring_js.withFinalResult) {
function startTurn(state) {
    const consumed = consumeArmedFrenzy(state);
    const started = {
        ...consumed,
        turnKills: 0,
        pendingChain: null,
        moverStartedAsPawn: false,
        captureAvailable: false,
    };
    return {
        ...started,
        captureAvailable: captureAvailableFor(started.board, started.turn, moveContextFor(started, started.turn)),
    };
}
function punishmentFires(state) {
    if (!state.rules.missKillPunishment) {
        return false;
    }
    if (state.turnKills > 0) {
        return false;
    }
    return state.captureAvailable === true;
}
function endOfTurn(state, mover, moverPieceId, events) {
    if (punishmentFires(state)) {
        return suspendForPunishment(state, mover, events);
    }
    const streak = settleFrenzyStreak(state, mover);
    const bonus = resolveKillBonuses(streak.state, mover, moverPieceId);
    const expired = {
        ...bonus.state,
        empowerment: expireQueenBuffs(bonus.state.empowerment, mover, bonus.state.moveCounter),
    };
    const nextPlayer = bonus.bonus === "extraTurn" ? mover : opponentOf(mover);
    const closed = closeFrenzyTurn(expired, mover);
    const advanced = advanceRounds(closed, mover);
    return checkGameEnd(advanced, nextPlayer, events);
}
function suspendForPunishment(state, mover, events) {
    const pending = {
        ...state,
        turn: opponentOf(mover),
        captureAvailable: null,
        pendingPunishment: { victimPlayer: mover },
    };
    return { state: pending, events };
}
function markTurn(turns, mover) {
    if (mover === "white") {
        return { ...turns, white: true };
    }
    return { ...turns, purple: true };
}
function advanceRounds(state, mover) {
    const roundTurns = markTurn(state.roundTurns, mover);
    if (!roundTurns.white || !roundTurns.purple) {
        return { ...state, roundTurns };
    }
    const counting = onePieceCondition(state.board);
    const rounds = state.roundHadKill || !counting ? 0 : state.endgameRounds + 1;
    return {
        ...state,
        endgameRounds: rounds,
        roundHadKill: false,
        roundTurns: emptyRoundTurns(),
    };
}
function endByWipeout(state, events) {
    const winner = wipeoutWinner(state.board);
    if (winner === null) {
        throw new Error("a wipeout ending needs a side without pieces");
    }
    const scored = scoreFlatBonus(state, winner, points.wipeoutWin);
    events.push(scored.event);
    const loser = opponentOf(winner);
    events.push({ type: "gameEnd", reason: "wipeout", winner, loser, standing: winner });
    const concluded = withFinalResult({ ...scored.state, status: "ended", winner, endReason: "wipeout", pendingChain: null }, "wipeout", winner);
    return { state: concluded, events };
}
function endByBlockage(state, events) {
    const loser = state.turn;
    const winner = opponentOf(loser);
    const scored = scoreFlatBonus(state, winner, points.blockageWin);
    events.push(scored.event);
    events.push({ type: "gameEnd", reason: "blockage", winner, loser, standing: winner });
    const concluded = withFinalResult({ ...scored.state, status: "ended", winner, endReason: "blockage" }, "blockage", winner);
    return { state: concluded, events };
}
function endByTwentyRounds(state, events) {
    const standing = standingOf(state.scores);
    const winner = standing === "tie" ? null : standing;
    const loser = winner === null ? null : opponentOf(winner);
    events.push({ type: "gameEnd", reason: "twenty-rounds", winner, loser, standing });
    const concluded = withFinalResult({ ...state, status: "ended", winner, endReason: "twenty-rounds" }, "twenty-rounds", winner);
    return { state: concluded, events };
}
function checkGameEnd(state, nextPlayer, events) {
    if (wipeoutWinner(state.board) !== null) {
        return endByWipeout(state, events);
    }
    const next = startTurn({ ...state, turn: nextPlayer });
    if (!hasAnyMove(next, next.turn)) {
        return endByBlockage(next, events);
    }
    if (next.endgameRounds >= ENDGAME_ROUNDS) {
        return endByTwentyRounds(next, events);
    }
    return { state: next, events };
}

return { startTurn: startTurn, punishmentFires: punishmentFires, endOfTurn: endOfTurn, endByWipeout: endByWipeout, endByBlockage: endByBlockage, endByTwentyRounds: endByTwentyRounds };
})();

// engine/game.js
var m_engine_game_js = (function (cloneBoard = m_engine_board_js.cloneBoard, clonePiece = m_engine_board_js.clonePiece, initialBoard = m_engine_board_js.initialBoard, pieceAt = m_engine_board_js.pieceAt, placePiece = m_engine_board_js.placePiece, clearSquare = m_engine_board_js.clearSquare, sameSquare = m_engine_board_js.sameSquare, wipeoutWinner = m_engine_board_js.wipeoutWinner, baseRules = m_engine_rules_js.baseRules, captureMovesFor = m_engine_captures_js.captureMovesFor, movesForPlayer = m_engine_legalmoves_js.movesForPlayer, endByWipeout = m_engine_turn_js.endByWipeout, endOfTurn = m_engine_turn_js.endOfTurn, startTurn = m_engine_turn_js.startTurn, markBuffMoved = m_engine_bonuses_js.markBuffMoved, moveContextFor = m_engine_context_js.moveContextFor, cloneFrenzy = m_engine_frenzy_js.cloneFrenzy, emptyFrenzy = m_engine_frenzy_js.emptyFrenzy, emptyRoundTurns = m_engine_scoring_js.emptyRoundTurns, emptyScores = m_engine_scoring_js.emptyScores, onePieceCondition = m_engine_scoring_js.onePieceCondition, scoreRemoval = m_engine_scoring_js.scoreRemoval, endByBlockage = m_engine_turn_js.endByBlockage, endByTwentyRounds = m_engine_turn_js.endByTwentyRounds) {

function createGame(rules = baseRules()) {
    return createGameFromBoard(initialBoard(), rules, "white");
}
function createGameFromBoard(board, rules, turn) {
    const state = {
        board: cloneBoard(board),
        turn,
        rules: { ...rules },
        status: "inProgress",
        winner: null,
        endReason: null,
        result: null,
        scores: emptyScores(),
        kills: emptyScores(),
        turnKills: 0,
        captureAvailable: false,
        pendingChain: null,
        pendingPunishment: null,
        empowerment: { frenzyOpenPlayers: [], activeBuffs: [] },
        frenzy: emptyFrenzy(),
        frenzyTurn: false,
        moverStartedAsPawn: false,
        moveCounter: 0,
        lastMoveOrder: {},
        endgameRounds: 0,
        endgameCounting: onePieceCondition(board),
        roundHadKill: false,
        roundTurns: emptyRoundTurns(),
    };
    return startTurn(state);
}
function legalMoves(state) {
    if (state.status === "ended") {
        return [];
    }
    if (state.pendingPunishment !== null) {
        return [];
    }
    if (state.pendingChain !== null) {
        return chainMoves(state);
    }
    return movesForPlayer(state, state.turn);
}
function hasLegalMove(state) {
    return legalMoves(state).length > 0;
}
function applyMove(state, move) {
    if (state.status === "ended") {
        throw new Error("the game has already ended");
    }
    const chosen = findLegalMove(state, move);
    if (chosen === null) {
        throw new Error("the move is not legal in this position");
    }
    const board = cloneBoard(state.board);
    const piece = pieceAt(board, chosen.from);
    if (piece === null) {
        throw new Error("there is no piece on the origin square");
    }
    const events = [];
    const carried = { ...state, board };
    const scored = removeVictims(carried, piece, chosen, events);
    clearSquare(board, chosen.from);
    const moved = placeMovedPiece(board, piece, chosen.to);
    const promoted = promoteIfReachedFarRow(moved, chosen.to);
    if (promoted !== null) {
        placePiece(board, chosen.to, promoted);
        events.push({
            type: "promote",
            player: promoted.player,
            pieceId: promoted.id,
            square: { ...chosen.to },
        });
    }
    const placed = pieceAt(board, chosen.to);
    if (placed === null) {
        throw new Error("the moving piece is not on the board");
    }
    const startedTurn = state.pendingChain === null;
    const advanced = recordMove({ ...scored, moverStartedAsPawn: startedTurn ? piece.kind === "pawn" : scored.moverStartedAsPawn }, piece.id, chosen.kills.length);
    const buffed = markBuffMoved(advanced, piece.id);
    const landing = {
        piece: placed,
        square: chosen.to,
        killed: chosen.kills.length > 0,
    };
    return finishTurn(buffed, piece.player, landing, events);
}
function endTurn(state) {
    if (state.status === "ended") {
        throw new Error("the game has already ended");
    }
    if (state.pendingPunishment !== null) {
        throw new Error("the punishment has to be resolved before the turn can end");
    }
    if (state.pendingChain === null) {
        throw new Error("there is no chain to end");
    }
    const events = [];
    const moverPieceId = state.pendingChain.pieceId;
    return endOfTurn({ ...state, pendingChain: null }, state.turn, moverPieceId, events);
}
function cloneState(state) {
    return copyStateFields(state);
}
function serializeState(state) {
    return JSON.stringify(state);
}
function deserializeState(text) {
    return copyStateFields(JSON.parse(text));
}
function copyStateFields(state) {
    return {
        ...state,
        board: cloneBoard(state.board),
        rules: { ...state.rules },
        pendingChain: clonePendingChain(state.pendingChain),
        pendingPunishment: clonePendingPunishment(state.pendingPunishment),
        empowerment: {
            frenzyOpenPlayers: [...state.empowerment.frenzyOpenPlayers],
            activeBuffs: state.empowerment.activeBuffs.map((buff) => ({ ...buff })),
        },
        frenzy: cloneFrenzy(state.frenzy),
        lastMoveOrder: { ...state.lastMoveOrder },
        scores: { ...state.scores },
        kills: { ...state.kills },
        result: cloneResult(state.result),
        roundTurns: { ...state.roundTurns },
    };
}
function cloneResult(result) {
    if (result === null) {
        return null;
    }
    return { ...result, scores: { ...result.scores }, kills: { ...result.kills } };
}
function findLegalMove(state, move) {
    for (const candidate of legalMoves(state)) {
        if (sameSquare(candidate.from, move.from) && sameSquare(candidate.to, move.to)) {
            return candidate;
        }
    }
    return null;
}
function chainMoves(state) {
    const chain = state.pendingChain;
    if (chain === null) {
        return [];
    }
    const piece = pieceAt(state.board, chain.square);
    if (piece === null || piece.id !== chain.pieceId) {
        return [];
    }
    return captureMovesFor(state.board, chain.square, piece, moveContextFor(state, state.turn));
}
function removeVictims(state, piece, move, events) {
    let current = state;
    for (const victimSquare of move.kills) {
        const victim = pieceAt(current.board, victimSquare);
        if (victim === null) {
            throw new Error("there is nothing to capture on the victim square");
        }
        clearSquare(current.board, victimSquare);
        events.push({
            type: "kill",
            player: piece.player,
            victim: clonePiece(victim),
            victimSquare: { ...victimSquare },
            byPieceId: piece.id,
        });
        const outcome = scoreRemoval(current, piece.player, victim);
        events.push(outcome.event);
        current = outcome.state;
    }
    return current;
}
function placeMovedPiece(board, piece, to) {
    const moved = clonePiece(piece);
    placePiece(board, to, moved);
    return moved;
}
function promoteIfReachedFarRow(piece, to) {
    if (piece.kind !== "pawn") {
        return null;
    }
    if (piece.player === "white" && to.row === 0) {
        return { ...piece, kind: "king" };
    }
    if (piece.player === "purple" && to.row === 7) {
        return { ...piece, kind: "king" };
    }
    return null;
}
function recordMove(state, pieceId, kills) {
    const order = state.moveCounter + 1;
    return {
        ...state,
        turnKills: state.turnKills + kills,
        moveCounter: order,
        lastMoveOrder: { ...state.lastMoveOrder, [String(pieceId)]: order },
    };
}
function finishTurn(state, mover, landing, events) {
    if (wipeoutWinner(state.board) !== null) {
        return endByWipeout(state, events);
    }
    if (landing.killed && state.rules.killLink && chainAvailable(state, landing.square)) {
        const chain = { pieceId: landing.piece.id, square: { ...landing.square } };
        return { state: { ...state, pendingChain: chain }, events };
    }
    return endOfTurn({ ...state, pendingChain: null }, mover, landing.piece.id, events);
}
function chainAvailable(state, landing) {
    const piece = pieceAt(state.board, landing);
    if (piece === null) {
        return false;
    }
    return captureMovesFor(state.board, landing, piece, moveContextFor(state, state.turn)).length > 0;
}
function clonePendingChain(chain) {
    if (chain === null) {
        return null;
    }
    return { pieceId: chain.pieceId, square: { ...chain.square } };
}
function clonePendingPunishment(pending) {
    if (pending === null) {
        return null;
    }
    return { victimPlayer: pending.victimPlayer };
}

return { createGame: createGame, createGameFromBoard: createGameFromBoard, legalMoves: legalMoves, hasLegalMove: hasLegalMove, applyMove: applyMove, endTurn: endTurn, cloneState: cloneState, serializeState: serializeState, deserializeState: deserializeState, endByWipeout: endByWipeout, endByBlockage: endByBlockage, endByTwentyRounds: endByTwentyRounds, startTurn: startTurn };
})();

// engine/punishment.js
var m_engine_punishment_js = (function (clearSquare = m_engine_board_js.clearSquare, cloneBoard = m_engine_board_js.cloneBoard, clonePiece = m_engine_board_js.clonePiece, pieceAt = m_engine_board_js.pieceAt, piecesOf = m_engine_board_js.piecesOf, squareOfPiece = m_engine_board_js.squareOfPiece, endOfTurn = m_engine_turn_js.endOfTurn, scoreRemoval = m_engine_scoring_js.scoreRemoval) {
const victimTierRank = {
    flying: 3,
    frenzy: 2,
    plain: 1,
};
function punishmentCandidates(state) {
    const pending = state.pendingPunishment;
    if (pending === null) {
        return [];
    }
    return piecesOf(state.board, pending.victimPlayer);
}
function applyPunishment(state, victimId) {
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
function pickVictim(state, rng) {
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
function victimTier(state, piece) {
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
function moveOrderOf(state, pieceId) {
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

return { victimTierRank: victimTierRank, punishmentCandidates: punishmentCandidates, applyPunishment: applyPunishment, pickVictim: pickVictim, victimTier: victimTier, moveOrderOf: moveOrderOf };
})();

// ui/localStorage.js
var m_ui_localStorage_js = (function () {
function getMuted() {
    try {
        return localStorage.getItem("draghts-muted") === "true";
    }
    catch {
        return false;
    }
}
function setMuted(value) {
    try {
        localStorage.setItem("draghts-muted", value ? "true" : "false");
    }
    catch {
    }
}
function getDashboard() {
    try {
        const raw = localStorage.getItem("draghts-dashboard");
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
            return parsed;
    }
    catch {
    }
    return [];
}
function setDashboard(rows) {
    try {
        localStorage.setItem("draghts-dashboard", JSON.stringify(rows));
    }
    catch {
    }
}
function appendDashboard(row) {
    const rows = getDashboard();
    rows.push(row);
    if (rows.length > 50) {
        rows.splice(0, rows.length - 50);
    }
    setDashboard(rows);
    return rows;
}
function activeRulesLabel(config) {
    const nums = [];
    if (config.beatAnyDirection)
        nums.push(1);
    if (config.missKillPunishment)
        nums.push(2);
    if (config.fourDirectionStepping)
        nums.push(3);
    if (config.forcedFullSlide)
        nums.push(4);
    if (config.killLink)
        nums.push(5);
    if (config.extraTurnBonus)
        nums.push(6);
    if (config.queenBuff)
        nums.push(7);
    if (config.killFrenzy)
        nums.push(8);
    if (nums.length === 0)
        return "Classic";
    return nums.join(" ");
}

return { getMuted: getMuted, setMuted: setMuted, getDashboard: getDashboard, setDashboard: setDashboard, appendDashboard: appendDashboard, activeRulesLabel: activeRulesLabel };
})();

// ui/sounds.js
var m_ui_sounds_js = (function (getMuted = m_ui_localStorage_js.getMuted) {

const VOLUMES = {
    "terror-scream": 0.7,
    "illegal-move": 0.5,
    "promoted-to-king": 0.8,
    "bonus-turn": 0.8,
    "frenzy-turn": 0.35,
    "win-against-AI": 0.8,
    "lose-against-AI": 0.8
};
class SoundPlayer {
    constructor() {
        this.audioCtx = null;
        this.unlocked = false;
        this.frenzySource = null;
        this.frenzyAudio = null;
        this.frenzyGain = null;
        this.frenzyLoopActive = false;
    }
    getContext() {
        if (!this.audioCtx) {
            const win = window;
            const AC = win.AudioContext ?? win.webkitAudioContext;
            this.audioCtx = new AC();
        }
        return this.audioCtx;
    }
    unlock() {
        if (this.unlocked) {
            return;
        }
        try {
            const ctx = this.getContext();
            if (ctx.state === "suspended") {
                ctx.resume().then(() => {
                    this.unlocked = true;
                }).catch(() => {
                    return;
                });
            }
            else {
                this.unlocked = true;
            }
        }
        catch {
            return;
        }
    }
    play(name, options = {}) {
        if (getMuted()) {
            return;
        }
        this.unlock();
        const url = "assets/audio/" + name + ".mp3";
        const volume = VOLUMES[name] ?? 0.7;
        if (options.loop && name === "frenzy-turn") {
            this.startFrenzyLoop(name, volume);
            return;
        }
        if (name === "frenzy-turn" && !options.loop) {
            this.stopFrenzyLoop();
            return;
        }
        const audio = document.createElement("audio");
        audio.src = url;
        audio.volume = volume;
        if (name === "terror-scream" && !options.playbackRate) {
            audio.playbackRate = 0.9 + Math.random() * 0.2;
        }
        else if (options.playbackRate && options.playbackRate !== 1) {
            audio.playbackRate = options.playbackRate;
        }
        if (options.loop) {
            audio.loop = true;
        }
        audio.play().catch(() => {
            return;
        });
    }
    startFrenzyLoop(name, volume) {
        if (this.frenzyLoopActive) {
            return;
        }
        this.frenzyLoopActive = true;
        const url = "assets/audio/" + name + ".mp3";
        fetch(url).then((r) => r.arrayBuffer()).then((buf) => this.getContext().decodeAudioData(buf)).then((audioBuffer) => {
            if (!this.frenzyLoopActive || getMuted()) {
                return;
            }
            const ctx = this.getContext();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            const gain = ctx.createGain();
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);
            this.frenzyGain = gain;
            this.frenzySource = source;
        }).catch(() => {
            const audio = document.createElement("audio");
            audio.src = url;
            audio.volume = volume;
            audio.loop = true;
            audio.play().catch(() => {
                return;
            });
            this.frenzyAudio = audio;
        });
    }
    stopFrenzyLoop() {
        this.frenzyLoopActive = false;
        if (this.frenzySource) {
            try {
                this.frenzySource.stop();
            }
            catch {
                return;
            }
            try {
                this.frenzySource.disconnect();
            }
            catch {
                return;
            }
            this.frenzySource = null;
        }
        if (this.frenzyGain) {
            try {
                this.frenzyGain.disconnect();
            }
            catch {
                return;
            }
            this.frenzyGain = null;
        }
        if (this.frenzyAudio) {
            try {
                this.frenzyAudio.pause();
            }
            catch {
                return;
            }
            this.frenzyAudio.removeAttribute("src");
            try {
                this.frenzyAudio.load();
            }
            catch {
                return;
            }
            this.frenzyAudio = null;
        }
    }
    stopAll() {
        this.stopFrenzyLoop();
    }
}
let globalPlayer = null;
function getSoundPlayer() {
    if (!globalPlayer) {
        globalPlayer = new SoundPlayer();
    }
    return globalPlayer;
}
function playSound(name, options) {
    getSoundPlayer().play(name, options);
}
function startFrenzyLoop() {
    getSoundPlayer().play("frenzy-turn", { loop: true });
}
function stopFrenzyLoopSound() {
    getSoundPlayer().stopFrenzyLoop();
}
function ensureGestureUnlock() {
    const unlockOnce = () => {
        getSoundPlayer().unlock();
    };
    window.addEventListener("pointerdown", unlockOnce, { once: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
    window.addEventListener("touchstart", unlockOnce, { once: true });
}

return { SoundPlayer: SoundPlayer, getSoundPlayer: getSoundPlayer, playSound: playSound, startFrenzyLoop: startFrenzyLoop, stopFrenzyLoopSound: stopFrenzyLoopSound, ensureGestureUnlock: ensureGestureUnlock };
})();

// ui/toasts.js
var m_ui_toasts_js = (function () {
const toasts = [];
let nextId = 1;
function addToast(text) {
    const id = nextId++;
    toasts.push({ id, text });
    renderToasts();
    setTimeout(() => {
        removeToast(id);
    }, 3000);
    return id;
}
function removeToast(id) {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx >= 0) {
        toasts.splice(idx, 1);
        renderToasts();
    }
}
function renderToasts() {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "false");
        document.body.appendChild(container);
    }
    container.textContent = "";
    for (const t of toasts) {
        const el = document.createElement("div");
        el.className = "toast";
        el.textContent = t.text;
        container.appendChild(el);
    }
}

return { addToast: addToast, removeToast: removeToast };
})();

// ui/board.js
var m_ui_board_js = (function (pieceAt = m_engine_board_js.pieceAt, BOARD_SIZE = m_engine_board_js.BOARD_SIZE, legalMoves = m_engine_game_js.legalMoves, applyMove = m_engine_game_js.applyMove, cloneState = m_engine_game_js.cloneState, createGame = m_engine_game_js.createGame, applyPunishment = m_engine_punishment_js.applyPunishment, playSound = m_ui_sounds_js.playSound, addToast = m_ui_toasts_js.addToast) {
class BoardUI {
    constructor(container, initialState, computer = null) {
        this.pulseTimer = null;
        this.pulseOn = false;
        this.container = container;
        this.computerColour = normalizeComputer(computer);
        this.stateData = freshUIState(initialState ?? createGame());
    }
    setStateChangeCallback(cb) {
        this.onStateChange = cb;
    }
    init() {
        this.clearPulse();
        syncSelection(this, this.stateData.state, this.stateData.state);
        this.render();
        this.updateBanner();
        this.updatePickerBanner();
        bindBoardEvents(this);
    }
    setComputerColour(colour) {
        this.computerColour = colour;
    }
    setLastMove(from, to) {
        this.stateData.lastFrom = { ...from };
        this.stateData.lastTo = { ...to };
        this.render();
    }
    clearLastMove() {
        this.stateData.lastFrom = null;
        this.stateData.lastTo = null;
    }
    applyEngineState(state, events = []) {
        const prev = this.stateData.state;
        this.stateData.state = cloneState(state);
        syncSelection(this, prev, this.stateData.state);
        this.render();
        this.updateBanner();
        this.updatePickerBanner();
        if (this.onStateChange) {
            this.onStateChange(this.stateData.state, events);
        }
    }
    render() {
        renderInto(this);
    }
    updateBanner() {
        const text = this.stateData.state.turn.toUpperCase() + " to move";
        const primary = document.getElementById("hud-turn-banner");
        if (primary) {
            primary.textContent = text;
        }
        const fallback = document.getElementById("turn-banner");
        if (fallback) {
            fallback.textContent = text;
        }
    }
    updatePickerBanner() {
        const banner = document.getElementById("picker-banner");
        if (!banner) {
            return;
        }
        if (this.stateData.pickerActive) {
            const offender = offenderOf(this.stateData.state);
            const chooser = this.stateData.state.turn.toUpperCase();
            const off = offender === null ? "OPPONENT" : offender.toUpperCase();
            banner.textContent = off + " missed a kill — " + chooser + " picks a victim";
            banner.classList.remove("hidden");
        }
        else {
            banner.classList.add("hidden");
        }
    }
    ensurePulse() {
        if (reducedMotion()) {
            return;
        }
        if (this.pulseTimer !== null) {
            return;
        }
        this.pulseTimer = window.setInterval(() => {
            this.pulseOn = !this.pulseOn;
            const el = this.container.querySelector(".square.selected");
            if (el) {
                el.classList.toggle("pulse", this.pulseOn);
            }
        }, 600);
    }
    clearPulse() {
        if (this.pulseTimer !== null) {
            clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }
        this.pulseOn = false;
        const el = this.container.querySelector(".square.selected.pulse");
        if (el) {
            el.classList.remove("pulse");
        }
    }
    selectPiece(square, piece) {
        this.clearSelectionFields();
        this.stateData.selectedSquare = { ...square };
        this.stateData.selectedPieceId = piece.id;
        const moves = legalMoves(this.stateData.state);
        if (this.stateData.state.pendingChain !== null) {
            this.stateData.legalDestinations = moves.map((m) => ({ ...m.to }));
        }
        else {
            this.stateData.legalDestinations = moves
                .filter((m) => m.from.row === square.row && m.from.column === square.column)
                .map((m) => ({ ...m.to }));
        }
        this.render();
        this.ensurePulse();
    }
    clearSelection() {
        this.clearSelectionFields();
        this.clearPulse();
        this.render();
    }
    clearSelectionFields() {
        this.stateData.selectedSquare = null;
        this.stateData.selectedPieceId = null;
        this.stateData.legalDestinations = [];
    }
    flashIllegal(square) {
        const el = this.getSquareElement(square);
        if (el) {
            el.classList.add("illegal-flash");
            window.setTimeout(() => {
                el.classList.remove("illegal-flash");
            }, 300);
        }
        playSound("illegal-move");
        const detail = { square: { ...square } };
        this.container.dispatchEvent(new CustomEvent("draghts:illegal-move", { detail, bubbles: true }));
        document.dispatchEvent(new CustomEvent("draghts:illegal-move", { detail }));
    }
    getSquareElement(square) {
        return this.container.querySelector('.square[data-row="' + square.row + '"][data-column="' + square.column + '"]');
    }
}
function normalizeComputer(computer) {
    if (computer === "white" || computer === "purple") {
        return computer;
    }
    if (computer === true) {
        return "purple";
    }
    return null;
}
function freshUIState(state) {
    return {
        state,
        selectedSquare: null,
        selectedPieceId: null,
        legalDestinations: [],
        lastFrom: null,
        lastTo: null,
        pickerActive: false,
    };
}
function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function offenderOf(state) {
    if (state.pendingPunishment === null) {
        return null;
    }
    return state.pendingPunishment.victimPlayer;
}
function syncSelection(board, prev, curr) {
    if (curr.pendingPunishment !== null) {
        if (prev.pendingPunishment === null) {
            board.clearSelectionFields();
            board.clearPulse();
        }
        board.stateData.pickerActive = true;
    }
    else {
        board.stateData.pickerActive = false;
    }
    if (curr.pendingChain !== null) {
        selectChainPiece(board, curr);
    }
    else if (prev.pendingChain !== null) {
        board.clearSelectionFields();
        board.clearPulse();
    }
    if (curr.status === "ended") {
        board.clearSelectionFields();
        board.clearPulse();
        board.stateData.pickerActive = false;
    }
}
function selectChainPiece(board, curr) {
    const chain = curr.pendingChain;
    if (chain === null) {
        return;
    }
    board.stateData.selectedSquare = { ...chain.square };
    board.stateData.selectedPieceId = chain.pieceId;
    board.stateData.legalDestinations = legalMoves(curr).map((m) => ({ ...m.to }));
    board.ensurePulse();
}
function renderInto(board) {
    const ui = board.stateData;
    const grid = document.createElement("div");
    grid.id = "board-grid";
    grid.className = "board-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", "Checkers board");
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            grid.appendChild(makeSquare(board, ui, row, col));
        }
    }
    const existing = board.container.querySelector("#board-grid");
    if (existing) {
        board.container.replaceChild(grid, existing);
    }
    else {
        board.container.appendChild(grid);
    }
}
function makeSquare(board, ui, row, col) {
    const dark = (row + col) % 2 === 1;
    const div = document.createElement("div");
    div.className = dark ? "square dark playable" : "square light";
    div.dataset.row = String(row);
    div.dataset.column = String(col);
    div.setAttribute("role", "gridcell");
    div.setAttribute("aria-label", "square " + row + ", " + col);
    div.setAttribute("tabindex", dark ? "0" : "-1");
    const piece = pieceAt(ui.state.board, { row, column: col });
    if (piece !== null) {
        div.appendChild(makePieceEl(piece, ui, board.computerColour));
    }
    if (ui.selectedSquare !== null && ui.selectedSquare.row === row && ui.selectedSquare.column === col) {
        div.classList.add("selected");
    }
    if (ui.legalDestinations.some((s) => s.row === row && s.column === col)) {
        div.classList.add("legal-destination");
    }
    if (isLastMove(ui, row, col)) {
        div.style.outline = "2px solid #ffd700";
    }
    return div;
}
function isLastMove(ui, row, col) {
    const from = ui.lastFrom;
    const to = ui.lastTo;
    if (from === null || to === null) {
        return false;
    }
    return (from.row === row && from.column === col) || (to.row === row && to.column === col);
}
function makePieceEl(piece, ui, computerColour) {
    const el = document.createElement("div");
    el.className = "piece " + piece.player + (piece.kind === "king" ? " king-ring" : "");
    if (ui.state.empowerment.activeBuffs.some((b) => b.pieceId === piece.id)) {
        el.classList.add("queen-buff");
    }
    if (computerColour !== null && piece.player === computerColour) {
        const img = document.createElement("img");
        img.src = "assets/draghts-logo.webp";
        img.alt = "drAGhts logo";
        img.className = "draghts-logo";
        el.appendChild(img);
    }
    else {
        el.textContent = piece.kind === "king" ? "K" : "";
    }
    if (ui.pickerActive) {
        const offender = offenderOf(ui.state);
        if (offender !== null && piece.player === offender) {
            el.style.outline = "2px solid #ffd700";
            el.style.cursor = "pointer";
        }
    }
    return el;
}
function bindBoardEvents(board) {
    board.container.addEventListener("click", (e) => {
        const target = e.target;
        if (!target) {
            return;
        }
        const squareEl = target.closest(".square");
        if (!squareEl) {
            return;
        }
        const square = squareFromElement(squareEl);
        if (square === null) {
            return;
        }
        onSquareClick(board, square);
    });
    board.container.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") {
            return;
        }
        const focusEl = document.activeElement;
        if (!focusEl || !focusEl.classList.contains("square")) {
            return;
        }
        const square = squareFromElement(focusEl);
        if (square === null) {
            return;
        }
        onSquareClick(board, square);
    });
}
function squareFromElement(el) {
    const row = parseInt(el.dataset.row ?? "", 10);
    const col = parseInt(el.dataset.column ?? "", 10);
    if (Number.isNaN(row) || Number.isNaN(col)) {
        return null;
    }
    return { row, column: col };
}
function onSquareClick(board, square) {
    const state = board.stateData.state;
    if (state.status === "ended") {
        return;
    }
    if (state.pendingPunishment !== null) {
        onPickerClick(board, square);
        return;
    }
    if (state.pendingChain !== null) {
        onChainClick(board, square);
        return;
    }
    const clicked = pieceAt(state.board, square);
    if (clicked !== null && clicked.player === state.turn) {
        toggleSelect(board, square, clicked);
        return;
    }
    if (board.stateData.selectedSquare === null || board.stateData.selectedPieceId === null) {
        return;
    }
    const legal = board.stateData.legalDestinations.some((s) => s.row === square.row && s.column === square.column);
    if (legal) {
        moveToDestination(board, square);
    }
    else {
        board.flashIllegal(square);
    }
}
function toggleSelect(board, square, piece) {
    const sel = board.stateData.selectedSquare;
    if (sel !== null && sel.row === square.row && sel.column === square.column) {
        board.clearSelection();
    }
    else {
        board.selectPiece(square, piece);
    }
}
function onPickerClick(board, square) {
    const piece = pieceAt(board.stateData.state.board, square);
    if (piece === null) {
        return;
    }
    const offender = offenderOf(board.stateData.state);
    if (offender === null || piece.player !== offender) {
        return;
    }
    try {
        const result = applyPunishment(board.stateData.state, piece.id);
        board.applyEngineState(result.state, result.events);
    }
    catch {
        addToast("That victim cannot be picked.");
    }
}
function onChainClick(board, square) {
    const chain = board.stateData.state.pendingChain;
    if (!chain) {
        return;
    }
    if (chain.square.row === square.row && chain.square.column === square.column) {
        return;
    }
    const moves = legalMoves(board.stateData.state);
    const match = moves.find((m) => m.from.row === chain.square.row &&
        m.from.column === chain.square.column &&
        m.to.row === square.row &&
        m.to.column === square.column);
    if (!match) {
        board.flashIllegal(square);
        return;
    }
    try {
        const result = applyMove(board.stateData.state, match);
        board.stateData.lastFrom = { ...match.from };
        board.stateData.lastTo = { ...match.to };
        board.applyEngineState(result.state, result.events);
    }
    catch {
        board.flashIllegal(square);
    }
}
function moveToDestination(board, to) {
    const selected = board.stateData.selectedSquare;
    if (selected === null) {
        return;
    }
    const moves = legalMoves(board.stateData.state);
    const match = moves.find((m) => m.from.row === selected.row &&
        m.from.column === selected.column &&
        m.to.row === to.row &&
        m.to.column === to.column);
    if (!match) {
        board.flashIllegal(to);
        return;
    }
    try {
        const result = applyMove(board.stateData.state, match);
        board.stateData.lastFrom = { ...match.from };
        board.stateData.lastTo = { ...match.to };
        board.clearSelectionFields();
        board.clearPulse();
        board.applyEngineState(result.state, result.events);
    }
    catch {
        board.flashIllegal(to);
    }
}

return { BoardUI: BoardUI };
})();

// engine/ai/evaluate.js
var m_engine_ai_evaluate_js = (function () {
const WEIGHT_PAWN = 100;
const WEIGHT_KING = 160;
const WEIGHT_BACK_ROW = 60;
const WEIGHT_TWO_CENTRE = 40;
const WEIGHT_OTHER_CENTRE = 10;
const WEIGHT_QUEEN_BUFF = 80;
const WEIGHT_FRENZY_OPEN = 40;
const WEIGHT_PENDING_FRENZY = 60;
function evaluate(state, options) {
    const player = state.turn;
    const aggression = clampAggression(options.aggression);
    const ownWeight = ownPieceWeight(aggression);
    const captureWeight = aggressionCaptureWeight(aggression);
    if (state.status === "ended") {
        const winner = state.result?.winner ?? null;
        // tie scores neutral; upstream scores tie as loss
        if (winner === null || winner === "tie") {
            return 0;
        }
        return winner === player ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
    let score = 0;
    for (let row = 0; row < state.board.length; row++) {
        const rowData = state.board[row];
        if (!rowData)
            continue;
        for (let col = 0; col < rowData.length; col++) {
            const cell = rowData[col];
            if (cell === null || cell === undefined) {
                continue;
            }
            const piece = cell;
            const square = { row, column: col };
            let value = pieceValue(state, piece, square);
            if (piece.player === player) {
                value *= ownWeight;
            }
            else {
                value *= captureWeight;
                value = -value;
            }
            score += value;
        }
    }
    if (state.frenzy[player].armed) {
        score += WEIGHT_PENDING_FRENZY;
    }
    return score;
}
function clampAggression(raw) {
    return Math.max(1, Math.min(5, raw));
}
function ownPieceWeight(aggression) {
    return 1.4 - (aggression - 1) * 0.1;
}
function aggressionCaptureWeight(aggression) {
    return 1.0 + (aggression - 1) * 0.3;
}
function backRowFor(player) {
    if (player === "white") {
        return 7;
    }
    return 0;
}
function pieceValue(state, piece, square) {
    let value = 0;
    if (piece.kind === "king") {
        value += WEIGHT_KING;
    }
    else {
        value += WEIGHT_PAWN;
    }
    value += pawnOnlyPositional(piece, square);
    const hasBuff = state.empowerment.activeBuffs.some((buff) => buff.pieceId === piece.id);
    if (hasBuff) {
        value += WEIGHT_QUEEN_BUFF;
    }
    if (piece.kind === "pawn" &&
        state.empowerment.frenzyOpenPlayers.includes(piece.player)) {
        value += WEIGHT_FRENZY_OPEN;
    }
    return value;
}
function pawnOnlyPositional(piece, square) {
    if (piece.kind !== "pawn") {
        return 0;
    }
    let bonus = 0;
    if (square.row === backRowFor(piece.player)) {
        bonus += WEIGHT_BACK_ROW;
    }
    if (isTwoCentre(square)) {
        bonus += WEIGHT_TWO_CENTRE;
    }
    else if (isOtherCentre(square)) {
        bonus += WEIGHT_OTHER_CENTRE;
    }
    return bonus;
}
function isTwoCentre(square) {
    return (square.row === 3 && square.column === 4) || (square.row === 4 && square.column === 3);
}
function isOtherCentre(square) {
    if (square.row < 2 || square.row > 5) {
        return false;
    }
    const isDark = (square.row + square.column) % 2 === 1;
    if (!isDark) {
        return false;
    }
    return !isTwoCentre(square);
}

return { evaluate: evaluate };
})();

// engine/ai/alpha-beta.js
var m_engine_ai_alpha_beta_js = (function (evaluate = m_engine_ai_evaluate_js.evaluate, applyMove = m_engine_game_js.applyMove, endTurn = m_engine_game_js.endTurn, legalMoves = m_engine_game_js.legalMoves, applyPunishment = m_engine_punishment_js.applyPunishment, pickVictim = m_engine_punishment_js.pickVictim) {
async function chooseMove(state, options) {
    checkDepth(options.depth);
    const aggression = clampAggression(options.aggression);
    const moves = legalMoves(state);
    if (moves.length === 0) {
        throw new Error("no available moves");
    }
    let bestMove = moves[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const move of moves) {
        const result = applyMove(state, move);
        let evaluation;
        if (isSameSide(state, result.state)) {
            evaluation = await alphaBetaSearch({
                state: result.state,
                depth: options.depth - 1,
                alpha: Number.NEGATIVE_INFINITY,
                beta: Number.POSITIVE_INFINITY,
                aggression,
                rng: options.rng,
            });
        }
        else {
            evaluation = -(await alphaBetaSearch({
                state: result.state,
                depth: options.depth - 1,
                alpha: Number.NEGATIVE_INFINITY,
                beta: Number.POSITIVE_INFINITY,
                aggression,
                rng: options.rng,
            }));
        }
        // first win keeps lead; upstream picks last on ties
        if (evaluation > bestScore) {
            bestScore = evaluation;
            bestMove = move;
        }
    }
    return bestMove;
}
async function alphaBetaSearch(params) {
    const { state, depth, alpha, beta, aggression, rng } = params;
    if (state.status === "ended") {
        return evaluate(state, { aggression });
    }
    if (state.pendingPunishment !== null) {
        return punishmentValue(state, aggression, rng);
    }
    if (depth === 0) {
        // no quiet extension; depth limit ends lookahead
        return evaluate(state, { aggression });
    }
    const moves = legalMoves(state);
    if (moves.length === 0) {
        if (state.pendingChain !== null) {
            return chainEndValue(state, aggression);
        }
        return evaluate(state, { aggression });
    }
    let value = Number.NEGATIVE_INFINITY;
    let currentAlpha = alpha;
    for (const move of moves) {
        const result = applyMove(state, move);
        let score;
        if (isSameSide(state, result.state)) {
            score = await alphaBetaSearch({
                state: result.state,
                depth: depth - 1,
                alpha: currentAlpha,
                beta,
                aggression,
                rng,
            });
        }
        else {
            score = -(await alphaBetaSearch({
                state: result.state,
                depth: depth - 1,
                alpha: -beta,
                beta: -currentAlpha,
                aggression,
                rng,
            }));
        }
        // fail-hard cutoff keeps bounds tight
        if (score >= beta) {
            return beta;
        }
        if (score > value) {
            value = score;
        }
        currentAlpha = Math.max(currentAlpha, score);
    }
    return value;
}
function isSameSide(before, after) {
    return before.turn === after.turn;
}
function punishmentValue(state, aggression, rng) {
    const victim = pickVictim(state, rng);
    if (victim === null) {
        return evaluate(state, { aggression });
    }
    const resolved = applyPunishment(state, victim.id);
    const raw = evaluate(resolved.state, { aggression });
    if (resolved.state.turn === state.turn) {
        return raw;
    }
    return -raw;
}
function chainEndValue(state, aggression) {
    try {
        const ended = endTurn(state);
        const raw = evaluate(ended.state, { aggression });
        if (ended.state.turn === state.turn) {
            return raw;
        }
        return -raw;
    }
    catch {
        return evaluate(state, { aggression });
    }
}
function checkDepth(depth) {
    if (depth !== 2 && depth !== 4 && depth !== 6) {
        throw new RangeError("depth must be 2, 4 or 6");
    }
}
function clampAggression(raw) {
    if (raw < 1) {
        return 1;
    }
    if (raw > 5) {
        return 5;
    }
    return raw;
}

return { chooseMove: chooseMove };
})();

// engine/ai/computer.js
var m_engine_ai_computer_js = (function (chooseMove = m_engine_ai_alpha_beta_js.chooseMove) {


return { chooseMove: chooseMove };
})();

// ui/start-screen.js
var m_ui_start_screen_js = (function (createGame = m_engine_game_js.createGame, startTurn = m_engine_game_js.startTurn, validateRules = m_engine_rules_js.validateRules, rulesWith = m_engine_rules_js.rulesWith, baseRules = m_engine_rules_js.baseRules, addToast = m_ui_toasts_js.addToast) {



let gameActive = false;
function isGameActive() {
    return gameActive;
}
class StartScreen {
    constructor(container, config) {
        this.starting = false;
        this.container = container;
        this.config = config;
        this.rules = config.currentRules ?? baseRules();
    }
    show() {
        gameActive = false;
        this.container.dataset.gameActive = "false";
        this.container.style.display = "block";
        this.starting = false;
        this.render();
        this.attach();
    }
    render() {
        const chaosRules = rulesWith({
            beatAnyDirection: true,
            missKillPunishment: true,
            forcedFullSlide: true,
            killLink: true,
            extraTurnBonus: true,
            queenBuff: true,
            killFrenzy: true,
        });
        const chaosActive = isSameRules(this.rules, chaosRules);
        const customActive = !isSameRules(this.rules, baseRules()) && !chaosActive;
        const togglesHTML = [
            { n: 1, label: "Beat any direction", key: "beatAnyDirection" },
            { n: 2, label: "Miss a kill, lose pawn", key: "missKillPunishment" },
            { n: 3, label: "Four-direction stepping", key: "fourDirectionStepping" },
            { n: 4, label: "Forced full slide", key: "forcedFullSlide" },
            { n: 5, label: "Kill link", key: "killLink" },
            { n: 6, label: "Extra turn bonus", key: "extraTurnBonus" },
            { n: 7, label: "Queen buff", key: "queenBuff" },
            { n: 8, label: "Kill frenzy", key: "killFrenzy" },
        ]
            .map((t) => `
      <label class="toggle-label" aria-label="Rule ${t.n}">
        <input type="checkbox" data-rule="${t.n}" ${this.rules[t.key] ? "checked" : ""}>
        <span class="toggle-text">Rule ${t.n}: ${t.label}</span>
      </label>
    `)
            .join("");
        this.container.innerHTML = `
      <div class="start-screen" aria-label="Start screen">
        <h2>drAGhts</h2>
        <section aria-label="Game mode">
          <h3>Mode</h3>
          <div class="mode-choices">
            <label><input type="radio" name="mode" value="hotseat" checked> Hot-seat</label>
            <label><input type="radio" name="mode" value="computer"> Computer</label>
          </div>
        </section>
        <section aria-label="Preset">
          <h3>Preset</h3>
          <div class="preset-choices">
            <label><input type="radio" name="preset" value="classic" ${!chaosActive && !customActive ? "checked" : ""}> Classic</label>
            <label><input type="radio" name="preset" value="chaos" ${chaosActive ? "checked" : ""}> Chaos</label>
            <label><input type="radio" name="preset" value="custom" ${customActive ? "checked" : ""}> Custom</label>
          </div>
        </section>
        <section id="computer-options" style="display:none;" aria-label="Computer options">
          <h3>Computer</h3>
          <label>Aggression <input type="range" id="aggression-slider" min="1" max="5" value="3"></label>
          <div class="difficulty-choices">
            <label><input type="radio" name="difficulty" value="2" checked> Easy (depth 2)</label>
            <label><input type="radio" name="difficulty" value="4"> Medium (depth 4)</label>
            <label><input type="radio" name="difficulty" value="6"> Hard (depth 6)</label>
          </div>
        </section>
        <section id="toggles-section" aria-label="Rule toggles" style="display:${customActive ? "block" : "none"};">
          <h3>Rules</h3>
          <div class="toggles" id="toggles">${togglesHTML}</div>
        </section>
        <div class="start-actions">
          <button type="button" id="start-btn">Start Game</button>
          <button type="button" id="dashboard-btn">Dashboard</button>
        </div>
        <div id="coin-flip" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    }
    attach() {
        const modeInputs = this.container.querySelectorAll('input[name="mode"]');
        modeInputs.forEach((el) => {
            el.addEventListener("change", () => {
                const isComputer = this.container.querySelector('input[name="mode"]:checked')?.value === "computer";
                const compSection = this.container.querySelector("#computer-options");
                if (compSection) {
                    compSection.style.display = isComputer ? "block" : "none";
                }
            });
        });
        const presetInputs = this.container.querySelectorAll('input[name="preset"]');
        presetInputs.forEach((el) => {
            el.addEventListener("change", () => {
                const value = this.container.querySelector('input[name="preset"]:checked')?.value;
                const togglesSection = this.container.querySelector("#toggles-section");
                if (value === "classic") {
                    this.setTogglesFromConfig(baseRules());
                    this.rules = baseRules();
                    if (togglesSection)
                        togglesSection.style.display = "none";
                }
                else if (value === "chaos") {
                    const chaos = rulesWith({
                        beatAnyDirection: true,
                        missKillPunishment: true,
                        forcedFullSlide: true,
                        killLink: true,
                        extraTurnBonus: true,
                        queenBuff: true,
                        killFrenzy: true,
                    });
                    this.setTogglesFromConfig(chaos);
                    this.rules = chaos;
                    if (togglesSection)
                        togglesSection.style.display = "none";
                }
                else if (value === "custom") {
                    if (togglesSection)
                        togglesSection.style.display = "block";
                }
            });
        });
        const toggles = this.container.querySelectorAll('input[type="checkbox"]');
        toggles.forEach((el) => {
            el.addEventListener("change", () => {
                this.applyLiveValidation();
            });
        });
        const startBtn = this.container.querySelector("#start-btn");
        if (startBtn) {
            startBtn.addEventListener("click", () => {
                this.startGame();
            });
        }
        const dashBtn = this.container.querySelector("#dashboard-btn");
        if (dashBtn) {
            dashBtn.addEventListener("click", () => {
                this.config.onDashboard();
            });
        }
    }
    applyLiveValidation() {
        const candidate = rulesWith(this.readToggles());
        const validated = validateRules(candidate);
        this.rules = validated.config;
        if (validated.corrections.length > 0) {
            this.setTogglesFromConfig(validated.config);
            for (const corr of validated.corrections) {
                addToast(corr.reason);
            }
        }
    }
    readToggles() {
        const overrides = {};
        const keyMap = {
            1: "beatAnyDirection",
            2: "missKillPunishment",
            3: "fourDirectionStepping",
            4: "forcedFullSlide",
            5: "killLink",
            6: "extraTurnBonus",
            7: "queenBuff",
            8: "killFrenzy",
        };
        for (let n = 1; n <= 8; n++) {
            const el = this.container.querySelector(`input[data-rule="${n}"]`);
            if (el) {
                const key = keyMap[n];
                if (key) {
                    overrides[key] = el.checked;
                }
            }
        }
        return overrides;
    }
    setTogglesFromConfig(config) {
        const map = {
            1: "beatAnyDirection",
            2: "missKillPunishment",
            3: "fourDirectionStepping",
            4: "forcedFullSlide",
            5: "killLink",
            6: "extraTurnBonus",
            7: "queenBuff",
            8: "killFrenzy",
        };
        for (const entry of Object.entries(map)) {
            const n = Number(entry[0]);
            const key = entry[1];
            const el = this.container.querySelector(`input[data-rule="${n}"]`);
            if (el) {
                el.checked = !!config[key];
            }
        }
    }
    updateRulesFromUI() {
        this.rules = rulesWith(this.readToggles());
    }
    startGame() {
        if (this.starting)
            return;
        this.updateRulesFromUI();
        const validated = validateRules(this.rules);
        this.rules = validated.config;
        if (validated.corrections.length > 0) {
            this.setTogglesFromConfig(validated.config);
            for (const corr of validated.corrections) {
                addToast(corr.reason);
            }
        }
        const correctedRules = this.rules;
        const isComputer = this.container.querySelector('input[name="mode"]:checked')?.value === "computer";
        const aggressionEl = this.container.querySelector("#aggression-slider");
        const aggression = parseInt(aggressionEl?.value ?? "3", 10);
        const depthStr = this.container.querySelector('input[name="difficulty"]:checked')?.value ?? "2";
        const depth = parseInt(depthStr, 10);
        const whiteFirst = Math.random() < 0.5;
        const initialTurn = (whiteFirst ? "white" : "purple");
        const result = createGame(correctedRules);
        const gameState = startTurn({ ...result, turn: initialTurn });
        const whitePlayer = isComputer ? "Human" : "White";
        const purplePlayer = isComputer ? "Computer" : "Purple";
        const computerColour = isComputer ? "purple" : null;
        const detail = { whitePlayer, purplePlayer, computerColour, firstTurn: initialTurn };
        const coinFlipEl = this.container.querySelector("#coin-flip");
        if (coinFlipEl) {
            coinFlipEl.textContent = `Colour assigned: ${initialTurn === "white" ? "White plays first" : "Purple plays first"}`;
        }
        const gameArea = document.getElementById("game-area");
        if (gameArea) {
            gameArea.dataset.firstTurn = initialTurn;
            gameArea.dataset.whitePlayer = whitePlayer;
            gameArea.dataset.purplePlayer = purplePlayer;
            if (computerColour) {
                gameArea.dataset.computerColour = computerColour;
            }
            else {
                delete gameArea.dataset.computerColour;
            }
        }
        this.starting = true;
        const startBtn = this.container.querySelector("#start-btn");
        if (startBtn)
            startBtn.disabled = true;
        window.setTimeout(() => {
            gameActive = true;
            this.container.dataset.gameActive = "true";
            this.container.style.display = "none";
            this.config.onStart(gameState, isComputer, aggression, depth, detail);
        }, 1200);
    }
}
function isSameRules(a, b) {
    return (a.beatAnyDirection === b.beatAnyDirection &&
        a.missKillPunishment === b.missKillPunishment &&
        a.fourDirectionStepping === b.fourDirectionStepping &&
        a.forcedFullSlide === b.forcedFullSlide &&
        a.killLink === b.killLink &&
        a.extraTurnBonus === b.extraTurnBonus &&
        a.queenBuff === b.queenBuff &&
        a.killFrenzy === b.killFrenzy);
}

return { isGameActive: isGameActive, StartScreen: StartScreen };
})();

// ui/hud.js
var m_ui_hud_js = (function (getMuted = m_ui_localStorage_js.getMuted, setMuted = m_ui_localStorage_js.setMuted, activeRulesLabel = m_ui_localStorage_js.activeRulesLabel, stopFrenzyLoopSound = m_ui_sounds_js.stopFrenzyLoopSound) {
class HUD {
    constructor(container) {
        this.container = container;
    }
    setUpdateCallback(cb) {
        this.onUpdate = cb;
    }
    init() {
        this.render();
    }
    update(state) {
        this.renderState(state);
        if (this.onUpdate) {
            this.onUpdate();
        }
    }
    updateTurnBanner(text) {
        const banner = this.container.querySelector("#hud-turn-banner");
        if (banner) {
            banner.textContent = text;
        }
    }
    render() {
        this.container.innerHTML = `
      <div class="hud-container" aria-label="Game heads-up display">
        <div class="hud-row hud-scores-row" aria-live="polite" aria-atomic="true">
          <div class="hud-player" id="hud-white">
            <span class="player-label">WHITE</span>
            <span class="player-score" id="score-white">0</span>
            <span class="streak-chip" id="streak-white">frenzy 0/3</span>
          </div>
          <div class="hud-player" id="hud-purple">
            <span class="player-label">PURPLE</span>
            <span class="player-score" id="score-purple">0</span>
            <span class="streak-chip" id="streak-purple">frenzy 0/3</span>
          </div>
        </div>
        <div class="hud-row">
          <div class="turn-banner" id="hud-turn-banner" aria-live="assertive" aria-atomic="true"></div>
        </div>
        <div class="hud-row" id="countdown-row" style="display:none;" aria-live="polite" aria-atomic="true">
          <span class="countdown-chip" aria-label="Endgame rounds remaining">20 rounds</span>
        </div>
        <div class="hud-row rules-chips" aria-label="Active rules"></div>
        <div class="hud-row" style="justify-content: flex-end;">
          <button type="button" id="mute-btn" class="mute-btn" aria-label="Mute" title="Mute">Mute</button>
        </div>
      </div>
    `;
        const muteBtn = this.container.querySelector("#mute-btn");
        if (muteBtn) {
            muteBtn.addEventListener("click", () => {
                const newValue = !getMuted();
                setMuted(newValue);
                muteBtn.textContent = newValue ? "Unmute" : "Mute";
                muteBtn.setAttribute("aria-label", newValue ? "Unmute" : "Mute");
                if (newValue) {
                    stopFrenzyLoopSound();
                }
            });
            muteBtn.textContent = getMuted() ? "Unmute" : "Mute";
            muteBtn.setAttribute("aria-label", getMuted() ? "Unmute" : "Mute");
        }
    }
    renderState(state) {
        const container = this.container.querySelector(".hud-container");
        if (!container)
            return;
        if (state.frenzyTurn) {
            container.classList.add("frenzy-active");
        }
        else {
            container.classList.remove("frenzy-active");
        }
        const scoreWhite = this.container.querySelector("#score-white");
        const scorePurple = this.container.querySelector("#score-purple");
        if (scoreWhite)
            scoreWhite.textContent = String(state.scores.white);
        if (scorePurple)
            scorePurple.textContent = String(state.scores.purple);
        const streakWhite = this.container.querySelector("#streak-white");
        const streakPurple = this.container.querySelector("#streak-purple");
        if (streakWhite) {
            streakWhite.textContent = streakLabel(state.frenzy.white.streak, state.frenzy.white.armed, state.frenzyTurn && state.turn === "white");
        }
        if (streakPurple) {
            streakPurple.textContent = streakLabel(state.frenzy.purple.streak, state.frenzy.purple.armed, state.frenzyTurn && state.turn === "purple");
        }
        this.updateTurnBanner(`${state.turn.toUpperCase()} to move`);
        const countdownRow = this.container.querySelector("#countdown-row");
        if (countdownRow) {
            if (state.endgameCounting && state.endgameRounds > 0) {
                countdownRow.style.display = "flex";
                const chip = countdownRow.querySelector(".countdown-chip");
                if (chip) {
                    chip.textContent = `${state.endgameRounds} rounds`;
                    chip.setAttribute("aria-label", `${state.endgameRounds} rounds remaining`);
                }
            }
            else {
                countdownRow.style.display = "none";
            }
        }
        const rulesRow = this.container.querySelector(".rules-chips");
        if (rulesRow) {
            rulesRow.textContent = "";
            const label = activeRulesLabel(state.rules);
            if (label === "Classic") {
                const chip = document.createElement("span");
                chip.className = "rule-chip";
                chip.textContent = "Classic";
                rulesRow.appendChild(chip);
            }
            else {
                const parts = label.split(" ");
                for (const part of parts) {
                    const chip = document.createElement("span");
                    chip.className = "rule-chip";
                    chip.textContent = part;
                    rulesRow.appendChild(chip);
                }
            }
        }
    }
}
function streakLabel(streak, armed, frenzyTurn) {
    if (armed || frenzyTurn)
        return "FRENZY!";
    return `frenzy ${streak}/3`;
}

return { HUD: HUD };
})();

// ui/end-screen.js
var m_ui_end_screen_js = (function (activeRulesLabel = m_ui_localStorage_js.activeRulesLabel) {
class EndScreen {
    constructor(container, config) {
        this.trigger = null;
        this.keyHandler = null;
        this.container = container;
        this.config = config;
    }
    show(state) {
        this.trigger = document.activeElement;
        const result = state.result;
        const winnerText = result ? (result.winner === "tie" ? "Tie" : result.winner.toUpperCase()) : "Unknown";
        const reasonText = result ? reasonLabel(result.reason) : "Unknown";
        const rulesText = activeRulesLabel(state.rules);
        this.container.innerHTML = `
      <div class="end-overlay" role="dialog" aria-label="Game over" aria-modal="true">
        <h2>Game Over</h2>
        <p class="end-result">Winner: <strong>${winnerText}</strong></p>
        <p>Reason: <strong>${reasonText}</strong></p>
        <div class="end-scores">
          <div>White: ${state.scores.white}</div>
          <div>Purple: ${state.scores.purple}</div>
        </div>
        <div class="end-kills">
          <div>White kills: ${state.kills.white}</div>
          <div>Purple kills: ${state.kills.purple}</div>
        </div>
        <div class="end-rules">Rules: <span class="rule-chip-row"><span class="rule-chip">${rulesText}</span></span></div>
        <div class="end-actions">
          <button type="button" id="play-again-btn">Play Again</button>
          <button type="button" id="change-rules-btn">Change Rules</button>
        </div>
      </div>
    `;
        this.container.style.display = "flex";
        const playBtn = this.container.querySelector("#play-again-btn");
        const rulesBtn = this.container.querySelector("#change-rules-btn");
        if (playBtn) {
            playBtn.addEventListener("click", () => {
                const settings = { rules: state.rules };
                this.hide();
                this.config.onPlayAgain(settings);
            });
        }
        if (rulesBtn) {
            rulesBtn.addEventListener("click", () => {
                this.hide();
                this.config.onChangeRules();
            });
        }
        this.keyHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.hide();
                this.config.onChangeRules();
            }
        };
        document.addEventListener("keydown", this.keyHandler);
        if (playBtn)
            playBtn.focus();
    }
    hide() {
        this.container.style.display = "none";
        if (this.keyHandler) {
            document.removeEventListener("keydown", this.keyHandler);
            this.keyHandler = null;
        }
        if (this.trigger && document.contains(this.trigger)) {
            this.trigger.focus();
        }
        this.trigger = null;
    }
}
function reasonLabel(reason) {
    if (reason === "wipeout")
        return "Wipeout";
    if (reason === "blockage")
        return "Blockage";
    if (reason === "twenty-rounds")
        return "20-round";
    return reason;
}

return { EndScreen: EndScreen };
})();

// ui/dashboard.js
var m_ui_dashboard_js = (function (getDashboard = m_ui_localStorage_js.getDashboard, setDashboard = m_ui_localStorage_js.setDashboard) {
class Dashboard {
    constructor(container, config) {
        this.trigger = null;
        this.keyHandler = null;
        this.container = container;
        this.config = config;
    }
    show() {
        this.trigger = document.activeElement;
        const stored = getDashboard();
        const rows = [...stored].reverse();
        const rowsHTML = rows.length === 0
            ? '<p class="dashboard-empty">No finished games yet.</p>'
            : `<div class="dashboard-table-wrapper"><table aria-label="Finished games" class="dashboard-table">
          <thead><tr><th>Date</th><th>Rules</th><th>Mode</th><th>Winner</th><th>P</th><th>P2/AI</th></tr></thead>
          <tbody>
            ${rows.map((r) => `<tr><td>${r.date}</td><td>${r.rules}</td><td>${r.mode}</td><td>${r.winner}</td><td>${r.pScore}</td><td>${r.p2Score}</td></tr>`).join("")}
          </tbody>
        </table></div>`;
        this.container.innerHTML = `
      <div class="dashboard-modal" role="dialog" aria-label="Dashboard" aria-modal="true">
        <h2>Dashboard</h2>
        ${rowsHTML}
        <div class="dashboard-actions">
          <button type="button" id="clear-dashboard-btn">Clear</button>
          <button type="button" id="close-dashboard-btn">Close</button>
        </div>
      </div>
    `;
        this.container.style.display = "flex";
        const clearBtn = this.container.querySelector("#clear-dashboard-btn");
        const closeBtn = this.container.querySelector("#close-dashboard-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (confirm("Clear all dashboard entries?")) {
                    setDashboard([]);
                    this.show();
                }
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.hide();
                this.config.onClose();
            });
        }
        this.keyHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.hide();
                this.config.onClose();
                return;
            }
            if (e.key !== "Tab")
                return;
            const modal = this.container.querySelector(".dashboard-modal");
            if (!modal)
                return;
            const focusable = Array.from(modal.querySelectorAll("button"));
            if (focusable.length === 0)
                return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            }
            else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", this.keyHandler);
        if (closeBtn)
            closeBtn.focus();
    }
    hide() {
        this.container.style.display = "none";
        if (this.keyHandler) {
            document.removeEventListener("keydown", this.keyHandler);
            this.keyHandler = null;
        }
        if (this.trigger && document.contains(this.trigger)) {
            this.trigger.focus();
        }
        this.trigger = null;
    }
}

return { Dashboard: Dashboard };
})();

// version.js
var m_version_js = (function () {
const GAME_NAME = "drAGhts";
const GAME_VERSION = "0.1.0";

return { GAME_NAME: GAME_NAME, GAME_VERSION: GAME_VERSION };
})();

// main.js
var m_main_js = (function (BoardUI = m_ui_board_js.BoardUI, applyMove = m_engine_game_js.applyMove, createGame = m_engine_game_js.createGame, deserializeState = m_engine_game_js.deserializeState, endTurn = m_engine_game_js.endTurn, legalMoves = m_engine_game_js.legalMoves, startTurn = m_engine_game_js.startTurn, chooseMove = m_engine_ai_computer_js.chooseMove, applyPunishment = m_engine_punishment_js.applyPunishment, pickVictim = m_engine_punishment_js.pickVictim, baseRules = m_engine_rules_js.baseRules, StartScreen = m_ui_start_screen_js.StartScreen, HUD = m_ui_hud_js.HUD, EndScreen = m_ui_end_screen_js.EndScreen, Dashboard = m_ui_dashboard_js.Dashboard, appendDashboard = m_ui_localStorage_js.appendDashboard, ensureGestureUnlock = m_ui_sounds_js.ensureGestureUnlock, getSoundPlayer = m_ui_sounds_js.getSoundPlayer, playSound = m_ui_sounds_js.playSound, startFrenzyLoop = m_ui_sounds_js.startFrenzyLoop, stopFrenzyLoopSound = m_ui_sounds_js.stopFrenzyLoopSound, GAME_NAME = m_version_js.GAME_NAME, GAME_VERSION = m_version_js.GAME_VERSION) {
const MOUNT_SELECTOR = "#draghts-app";
function main() {
    const hook = document.querySelector("[data-draghts]");
    if (!(hook instanceof HTMLElement)) {
        return;
    }
    hook.setAttribute("data-game", GAME_NAME);
    hook.setAttribute("data-version", GAME_VERSION);
    const els = readContainers();
    if (els === null) {
        return;
    }
    const session = buildSession(els);
    armGestureUnlock();
    wireEndTurn(session);
    const seed = readSeed(els.boardEl);
    if (seed !== null) {
        startGame(session, seed.state, seed.computerColour !== null, seed.computerColour, seed.aggression, seed.depth, null);
    }
    else {
        showStartScreen(session);
    }
}
function readContainers() {
    const startContainer = document.getElementById("start-screen-container");
    const hudContainer = document.getElementById("hud-container");
    const gameArea = document.getElementById("game-area");
    const boardEl = document.getElementById("board");
    const endContainer = document.getElementById("end-screen-container");
    const dashContainer = document.getElementById("dashboard-container");
    if (!startContainer || !hudContainer || !gameArea || !boardEl || !endContainer || !dashContainer) {
        return null;
    }
    return { startContainer, hudContainer, gameArea, boardEl, endContainer, dashContainer };
}
function buildSession(els) {
    let session;
    const endScreenUI = new EndScreen(els.endContainer, {
        onPlayAgain: () => startGameFromConfig(session),
        onChangeRules: () => showStartScreen(session),
    });
    const dashboardUI = new Dashboard(els.dashContainer, {
        onClose: () => {
            els.dashContainer.style.display = "none";
            showStartScreen(session);
        },
    });
    const startScreenUI = new StartScreen(els.startContainer, {
        onStart: (state, computerGame, aggression, depth) => {
            const colour = computerGame ? (Math.random() < 0.5 ? "white" : "purple") : null;
            startGame(session, state, computerGame, colour, aggression, depth, coinMessageFor(state.turn));
        },
        onDashboard: () => {
            dashboardUI.show();
            els.startContainer.style.display = "none";
        },
        currentRules: baseRules(),
    });
    session = {
        startContainer: els.startContainer,
        hudContainer: els.hudContainer,
        gameArea: els.gameArea,
        boardEl: els.boardEl,
        endContainer: els.endContainer,
        dashContainer: els.dashContainer,
        boardUI: null,
        hudUI: null,
        endScreenUI,
        dashboardUI,
        startScreenUI,
        isComputerGame: false,
        computerColour: null,
        aggression: 3,
        depth: 4,
        rules: baseRules(),
        gameId: 0,
        recordedFor: -1,
        prevState: null,
        computerThinking: false,
    };
    return session;
}
function armGestureUnlock() {
    ensureGestureUnlock();
    const unlock = () => getSoundPlayer().unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
}
function wireEndTurn(session) {
    const btn = document.getElementById("end-turn-btn");
    if (!btn) {
        return;
    }
    btn.addEventListener("click", () => {
        try {
            const ui = session.boardUI;
            if (ui) {
                const result = endTurn(ui.stateData.state);
                ui.applyEngineState(result.state, result.events);
            }
        }
        catch {
            return;
        }
    });
}
function showGame(session) {
    session.startContainer.style.display = "none";
    session.hudContainer.style.display = "block";
    session.gameArea.style.display = "block";
    session.endContainer.style.display = "none";
    session.dashContainer.style.display = "none";
}
function showStartScreen(session) {
    session.startContainer.style.display = "block";
    session.hudContainer.style.display = "none";
    session.gameArea.style.display = "none";
    session.endContainer.style.display = "none";
    session.dashContainer.style.display = "none";
    session.startScreenUI.show();
}
function startGame(session, state, computerGame, colour, aggression, depth, coin) {
    session.isComputerGame = computerGame;
    session.computerColour = computerGame ? (colour ?? state.turn) : null;
    session.aggression = aggression;
    session.depth = depth;
    session.rules = { ...state.rules };
    session.gameId += 1;
    session.prevState = state;
    showCoin(coin);
    showGame(session);
    if (session.boardUI === null) {
        const ui = new BoardUI(session.boardEl, state, session.computerColour);
        ui.setStateChangeCallback((next, events) => {
            handleEngineResult(session, { state: next, events }, session.prevState ?? next);
        });
        session.boardUI = ui;
        ui.init();
        const hud = new HUD(session.hudContainer);
        hud.init();
        session.hudUI = hud;
        handleEngineResult(session, { state, events: [] }, state);
        return;
    }
    session.boardUI.setComputerColour(session.computerColour);
    session.boardUI.clearLastMove();
    session.boardUI.applyEngineState(state, []);
}
function startGameFromConfig(session) {
    const whiteFirst = Math.random() < 0.5;
    const turn = whiteFirst ? "white" : "purple";
    const base = createGame(session.rules);
    const state = startTurn({ ...base, turn });
    const colour = session.isComputerGame
        ? (Math.random() < 0.5 ? "white" : "purple")
        : null;
    startGame(session, state, session.isComputerGame, colour, session.aggression, session.depth, coinMessageFor(turn));
}
function handleEngineResult(session, result, prev) {
    playEventSounds(result.events, prev, result.state);
    session.prevState = result.state;
    updateFrenzy(prev, result.state);
    if (session.hudUI) {
        session.hudUI.update(result.state);
    }
    setEndTurnVisible(result.state.pendingChain !== null);
    if (result.state.status === "ended") {
        handleGameEnd(session, result.state);
    }
    else {
        wireComputerTurn(session, result.state);
    }
}
function updateFrenzy(prev, next) {
    if (next.status === "ended") {
        stopFrenzyLoopSound();
        return;
    }
    if (next.frenzyTurn && !prev.frenzyTurn) {
        startFrenzyLoop();
    }
    else if (!next.frenzyTurn && prev.frenzyTurn) {
        stopFrenzyLoopSound();
    }
}
function playEventSounds(events, prev, next) {
    let kill = false;
    let punish = false;
    let promote = false;
    for (const e of events) {
        if (e.type === "kill") {
            kill = true;
        }
        else if (e.type === "punish") {
            punish = true;
        }
        else if (e.type === "promote") {
            promote = true;
        }
    }
    if (kill || punish) {
        playSound("terror-scream");
    }
    if (promote) {
        playSound("promoted-to-king");
    }
    if (next.empowerment.activeBuffs.length > prev.empowerment.activeBuffs.length) {
        playSound("bonus-turn");
    }
    else if (kill && next.status === "inProgress" && next.turn === prev.turn) {
        playSound("bonus-turn");
    }
}
function handleGameEnd(session, state) {
    stopFrenzyLoopSound();
    recordDashboardOnce(session, state);
    if (session.isComputerGame && session.computerColour !== null && state.result !== null) {
        if (state.result.winner === session.computerColour) {
            playSound("lose-against-AI");
        }
        else if (state.result.winner !== "tie") {
            playSound("win-against-AI");
        }
    }
    session.endScreenUI.show(state);
}
function recordDashboardOnce(session, state) {
    if (state.result === null || session.recordedFor === session.gameId) {
        return;
    }
    session.recordedFor = session.gameId;
    appendDashboard({
        date: (new Date().toISOString().split("T")[0] ?? ""),
        rules: rulesLabel(state.rules),
        mode: session.isComputerGame ? "PvAI" : "PvP",
        winner: state.result.winner === "tie" ? "tie" : state.result.winner,
        pScore: state.scores.white,
        p2Score: state.scores.purple,
    });
}
function wireComputerTurn(session, state) {
    if (!session.isComputerGame || session.computerColour === null || session.computerThinking) {
        return;
    }
    if (state.status !== "inProgress" || state.turn !== session.computerColour) {
        return;
    }
    if (state.pendingChain !== null && legalMoves(state).length === 0) {
        return;
    }
    session.computerThinking = true;
    const delay = 400 + Math.random() * 600;
    window.setTimeout(() => {
        void runComputerMove(session);
    }, delay);
}
function runComputerMove(session) {
    const step = async () => {
        for (let hop = 0; hop < 40; hop += 1) {
            const ui = session.boardUI;
            if (ui === null) {
                break;
            }
            const current = ui.stateData.state;
            if (current.status !== "inProgress" || current.turn !== session.computerColour) {
                break;
            }
            const progressed = await computerHop(session, current);
            if (!progressed) {
                break;
            }
        }
    };
    return step().finally(() => {
        session.computerThinking = false;
        const ui = session.boardUI;
        if (ui !== null) {
            wireComputerTurn(session, ui.stateData.state);
        }
    });
}
function computerHop(session, current) {
    const ui = session.boardUI;
    if (ui === null) {
        return Promise.resolve(false);
    }
    if (current.pendingPunishment !== null) {
        const victim = pickVictim(current, Math.random);
        if (victim === null) {
            return Promise.resolve(false);
        }
        try {
            const res = applyPunishment(current, victim.id);
            ui.applyEngineState(res.state, res.events);
            return Promise.resolve(true);
        }
        catch {
            return Promise.resolve(false);
        }
    }
    return chooseMove(current, { depth: session.depth, aggression: session.aggression, rng: Math.random }).then((move) => {
        try {
            const res = applyMove(current, move);
            ui.setLastMove(move.from, move.to);
            ui.applyEngineState(res.state, res.events);
            return true;
        }
        catch {
            return false;
        }
    }, () => false);
}
function showCoin(message) {
    const el = document.getElementById("coin-flip-result");
    if (el) {
        el.textContent = message ?? "";
    }
}
function coinMessageFor(turn) {
    return turn === "white" ? "White plays first" : "Purple plays first";
}
function setEndTurnVisible(visible) {
    const wrapper = document.getElementById("end-turn-wrapper");
    if (!wrapper) {
        return;
    }
    if (visible) {
        wrapper.classList.remove("hidden");
    }
    else {
        wrapper.classList.add("hidden");
    }
}
function rulesLabel(config) {
    const nums = [];
    if (config.beatAnyDirection) {
        nums.push(1);
    }
    if (config.missKillPunishment) {
        nums.push(2);
    }
    if (config.fourDirectionStepping) {
        nums.push(3);
    }
    if (config.forcedFullSlide) {
        nums.push(4);
    }
    if (config.killLink) {
        nums.push(5);
    }
    if (config.extraTurnBonus) {
        nums.push(6);
    }
    if (config.queenBuff) {
        nums.push(7);
    }
    if (config.killFrenzy) {
        nums.push(8);
    }
    return nums.join(",");
}
function readSeed(boardEl) {
    const raw = boardEl.getAttribute("data-draghts");
    if (raw === null || raw === "") {
        return null;
    }
    try {
        return normalizeSeed(JSON.parse(raw));
    }
    catch {
        return null;
    }
}
function normalizeSeed(parsed) {
    if (parsed === null || typeof parsed !== "object") {
        return null;
    }
    const root = parsed;
    const inner = root.state !== null && typeof root.state === "object"
        ? root.state
        : root;
    const state = seedState(inner);
    if (state === null) {
        return null;
    }
    return {
        state,
        computerColour: seedColour(root, inner, state.turn),
        aggression: seedNumber(root.aggression ?? inner.aggression, 3, 1, 5),
        depth: seedNumber(root.depth ?? inner.depth, 4, 1, 8),
    };
}
function seedState(inner) {
    try {
        if (Array.isArray(inner.board)) {
            return deserializeState(JSON.stringify(inner));
        }
        const rules = parseRules(inner.rules);
        const base = createGame(rules);
        const turn = inner.turn === "purple" ? "purple" : "white";
        return { ...base, turn };
    }
    catch {
        return null;
    }
}
function seedColour(root, inner, turn) {
    const raw = root.computerColour ?? inner.computerColour;
    if (raw === "white" || raw === "purple") {
        return raw;
    }
    if (root.computerGame === true || inner.computerGame === true) {
        return turn;
    }
    return null;
}
function seedNumber(value, fallback, min, max) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}
function parseRules(value) {
    const rules = baseRules();
    if (value === null || typeof value !== "object") {
        return rules;
    }
    const raw = value;
    const keys = [
        "beatAnyDirection",
        "missKillPunishment",
        "fourDirectionStepping",
        "forcedFullSlide",
        "killLink",
        "extraTurnBonus",
        "queenBuff",
        "killFrenzy",
    ];
    for (const key of keys) {
        const v = raw[key];
        if (typeof v === "boolean") {
            rules[key] = v;
        }
    }
    return rules;
}
main();

return { MOUNT_SELECTOR: MOUNT_SELECTOR };
})();
