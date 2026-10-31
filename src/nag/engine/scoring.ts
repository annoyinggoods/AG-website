import type { UnitId } from "./types.js";

const COUNTDOWN_MARK_PENALTY = 2;

export class Score {
  #value = 0;
  readonly #completedUnits = new Set<UnitId>();
  #countdownMarksApplied = 0;
  #meteredUnitsCharged = 0;

  get value(): number {
    return this.#value;
  }

  get completedUnitIds(): UnitId[] {
    return [...this.#completedUnits].sort((a, b) => a - b);
  }

  get meteredUnitsCharged(): number {
    return this.#meteredUnitsCharged;
  }

  awardUnit(unitId: UnitId): boolean {
    if (this.#completedUnits.has(unitId)) {
      return false;
    }
    this.#completedUnits.add(unitId);
    this.#value += 1;
    return true;
  }

  penalizeWrongFlip(): void {
    this.#value -= 1;
  }

  applyCountdownMarks(totalPassed: number): number {
    const fresh = Math.max(0, totalPassed - this.#countdownMarksApplied);
    this.#countdownMarksApplied = Math.max(this.#countdownMarksApplied, totalPassed);
    this.#value -= fresh * COUNTDOWN_MARK_PENALTY;
    return fresh;
  }

  chargeMeteredUnits(totalUnits: number): number {
    const fresh = Math.max(0, totalUnits - this.#meteredUnitsCharged);
    this.#meteredUnitsCharged = Math.max(this.#meteredUnitsCharged, totalUnits);
    this.#value = this.#value - fresh;
    return fresh;
  }
}
