export function elapsedMs(startedAtMs, nowMs, stoppedAtMs) {
    const end = stoppedAtMs ?? nowMs;
    return end - startedAtMs;
}
export function countdownRemainingMs(startedAtMs, totalMs, nowMs) {
    return totalMs - (nowMs - startedAtMs);
}
export function countPassedMarks(remainingMs, marksMs) {
    return marksMs.filter((mark) => remainingMs <= mark).length;
}
export function freePopupRemainingMs(startedAtMs, freeMs, nowMs) {
    return Math.max(0, freeMs - (nowMs - startedAtMs));
}
export function commencedUnits(viewMs, unitMs) {
    if (viewMs <= 0) {
        return 0;
    }
    return Math.ceil(viewMs / unitMs);
}
//# sourceMappingURL=timer-model.js.map