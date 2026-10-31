import type { Card, Deal, LevelConfig, Unit } from "./types.js";

export function fisherYatesShuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const moved = out[i]!;
    out[i] = out[j]!;
    out[j] = moved;
  }
  return out;
}

export function buildDeal(config: LevelConfig, rand: () => number): Deal {
  const placed: Card[] = [];
  config.units.forEach((unit, unitId) => {
    unit.faces.forEach((face) => {
      placed.push({ id: -1, face, unitId });
    });
  });
  const cards = fisherYatesShuffle(placed, rand).map((card, id) => ({ ...card, id }));
  const units = config.units.map((unit, unitId): Unit => {
    const cardIds = cards.filter((card) => card.unitId === unitId).map((card) => card.id);
    return { id: unitId, faces: unit.faces, cardIds };
  });
  return { cards, units };
}

export function createCryptoRandom(): () => number {
  return () => {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0]! / 0x100000000;
  };
}
