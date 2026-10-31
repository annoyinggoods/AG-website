export function elapsedMs(
  startedAtMs: number,
  nowMs: number,
  stoppedAtMs: number | null,
): number {
  const end = stoppedAtMs ?? nowMs;
  return end - startedAtMs;
}

export function countdownRemainingMs(
  startedAtMs: number,
  totalMs: number,
  nowMs: number,
): number {
  return totalMs - (nowMs - startedAtMs);
}

export function countPassedMarks(
  remainingMs: number,
  marksMs: readonly number[],
): number {
  return marksMs.filter((mark) => remainingMs <= mark).length;
}

export function freePopupRemainingMs(
  startedAtMs: number,
  freeMs: number,
  nowMs: number,
): number {
  return Math.max(0, freeMs - (nowMs - startedAtMs));
}

export function commencedUnits(viewMs: number, unitMs: number): number {
  if (viewMs <= 0) {
    return 0;
  }
  return Math.ceil(viewMs / unitMs);
}
