export function moveKey(move) {
    return [
        move.from.row,
        move.from.column,
        move.to.row,
        move.to.column,
        move.kind,
    ].join(",");
}
export function uniqueMoves(moves) {
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
//# sourceMappingURL=moveset.js.map