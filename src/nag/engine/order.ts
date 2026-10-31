import type { UnitId } from "./types.js";

export function requiredOrder(unitCount: number, anchorUnitId: UnitId): UnitId[] {
  const order: UnitId[] = [];
  for (let step = 0; step < unitCount; step++) {
    order.push((anchorUnitId + step) % unitCount);
  }
  return order;
}
