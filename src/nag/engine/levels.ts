import { fisherYatesShuffle } from "./shuffle.js";
import type { LevelConfig, UnitSpec } from "./types.js";

const LETTER_OFFSET_A = 65;

function numberPairUnits(highest: number): UnitSpec[] {
  const units: UnitSpec[] = [];
  for (let n = 1; n <= highest; n++) {
    units.push({ faces: [String(n), String(n)] });
  }
  return units;
}

function letterNumberPairUnits(): UnitSpec[] {
  const units: UnitSpec[] = [];
  for (let n = 1; n <= 18; n++) {
    units.push({ faces: [String(n), String.fromCharCode(LETTER_OFFSET_A + n - 1)] });
  }
  return units;
}

function singleCardUnits(faces: readonly string[]): UnitSpec[] {
  return faces.map((face) => ({ faces: [face] }));
}

function letterFaces(): string[] {
  const faces: string[] = [];
  for (let i = 0; i < 12; i++) {
    faces.push(String.fromCharCode(LETTER_OFFSET_A + i));
  }
  return faces;
}

function numberFaces(highest: number): string[] {
  const faces: string[] = [];
  for (let n = 1; n <= highest; n++) {
    faces.push(String(n));
  }
  return faces;
}

const LEVEL4_FACES: readonly string[] = [
  "1",
  "2A",
  "2B",
  "3A",
  "3B",
  "3C",
  "4A",
  "4B",
  "4C",
  "4D",
  "5A",
  "5B",
  "5C",
  "5D",
  "5E",
  "6",
  "7",
  "8",
  "9A",
  "9B",
  "9C",
  "9D",
  "9E",
  "9F",
  "10",
];

const LEVEL6_FACES: readonly string[] = [...letterFaces(), ...numberFaces(13)];

const LEVEL3_PENALTY_MARKS_MS: readonly number[] = [70000, 50000, 30000, 10000];

export function level1Config(): LevelConfig {
  return {
    id: 1,
    cols: 4,
    rows: 4,
    units: numberPairUnits(8),
    scoutCap: 14,
    scoutEnd: "pair",
    timeRule: { kind: "elapsed" },
    orderPopup: null,
  };
}

export function level2Config(): LevelConfig {
  return {
    id: 2,
    cols: 6,
    rows: 6,
    units: numberPairUnits(18),
    scoutCap: 19,
    scoutEnd: "pair",
    timeRule: { kind: "elapsed" },
    orderPopup: null,
  };
}

export function level3Config(): LevelConfig {
  return {
    id: 3,
    cols: 4,
    rows: 4,
    units: numberPairUnits(8),
    scoutCap: 14,
    scoutEnd: "pair",
    timeRule: { kind: "countdown", totalMs: 90000, penaltyMarksMs: LEVEL3_PENALTY_MARKS_MS },
    orderPopup: null,
  };
}

export function level4Config(): LevelConfig {
  return {
    id: 4,
    cols: 5,
    rows: 5,
    units: singleCardUnits(LEVEL4_FACES),
    scoutCap: 20,
    scoutEnd: "sequence",
    timeRule: { kind: "elapsed" },
    orderPopup: null,
  };
}

export function level5Config(): LevelConfig {
  return {
    id: 5,
    cols: 6,
    rows: 6,
    units: letterNumberPairUnits(),
    scoutCap: 25,
    scoutEnd: "pair",
    timeRule: { kind: "elapsed" },
    orderPopup: { kind: "free", stripRetireAfterPairs: 3 },
  };
}

export function createLevel6Config(rand: () => number): LevelConfig {
  const order = fisherYatesShuffle(LEVEL6_FACES, rand);
  return {
    id: 6,
    cols: 5,
    rows: 5,
    units: singleCardUnits(order),
    scoutCap: 20,
    scoutEnd: "sequence",
    timeRule: { kind: "elapsed" },
    orderPopup: { kind: "metered", freeMs: 15000, meterUnitMs: 1500, graceMs: 1000 },
  };
}

export function createLevel(id: number, rand?: () => number): LevelConfig {
  if (id === 6) {
    if (rand === undefined) {
      throw new Error("Level 6 needs a randomness source for its order permutation");
    }
    return createLevel6Config(rand);
  }
  switch (id) {
    case 1:
      return level1Config();
    case 2:
      return level2Config();
    case 3:
      return level3Config();
    case 4:
      return level4Config();
    case 5:
      return level5Config();
    default:
      throw new Error(`Unknown level id: ${id}`);
  }
}
