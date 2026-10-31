export function fisherYatesShuffle(items, rand) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const moved = out[i];
        out[i] = out[j];
        out[j] = moved;
    }
    return out;
}
export function buildDeal(config, rand) {
    const placed = [];
    config.units.forEach((unit, unitId) => {
        unit.faces.forEach((face) => {
            placed.push({ id: -1, face, unitId });
        });
    });
    const cards = fisherYatesShuffle(placed, rand).map((card, id) => ({ ...card, id }));
    const units = config.units.map((unit, unitId) => {
        const cardIds = cards.filter((card) => card.unitId === unitId).map((card) => card.id);
        return { id: unitId, faces: unit.faces, cardIds };
    });
    return { cards, units };
}
export function createCryptoRandom() {
    return () => {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / 0x100000000;
    };
}
//# sourceMappingURL=shuffle.js.map