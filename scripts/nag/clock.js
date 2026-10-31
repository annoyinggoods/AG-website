/**
 * The clock the game measures with.
 *
 * The game measures the elapsed time of a run, the time a player spent
 * looking at the order, and the time left on a countdown. All three are
 * times between two moments, so they want a clock that only moves forward
 * and that cannot jump when the machine is busy.
 *
 * `Date.now` is a wall clock. It jumps when the machine changes its time,
 * and it counts the time the browser spends waiting on the page, which is
 * not the time the player spent playing. `performance.now` is a monotonic
 * clock: it only moves forward, it is not affected by a clock change, and
 * it is measured against the start of the page.
 */
export function now() {
    return performance.now();
}
//# sourceMappingURL=clock.js.map