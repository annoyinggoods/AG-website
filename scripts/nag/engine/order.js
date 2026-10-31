export function requiredOrder(unitCount, anchorUnitId) {
    const order = [];
    for (let step = 0; step < unitCount; step++) {
        order.push((anchorUnitId + step) % unitCount);
    }
    return order;
}
//# sourceMappingURL=order.js.map