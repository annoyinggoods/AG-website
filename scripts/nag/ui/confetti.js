/**
 * The celebration on the win screen. The module is loaded on demand, so the
 * cost of the library only lands on the run that earned it.
 *
 * The path is built at runtime because the module lives in the assets folder
 * and the page can sit at any depth below the domain root.
 */
const CONFETTI_PATH = "/assets/nag/canvas-confetti.module.mjs";
export async function fireConfetti() {
    const module = (await import(CONFETTI_PATH));
    module.default({
        particleCount: 140,
        spread: 70,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.55 },
        disableForReducedMotion: true,
    });
}
//# sourceMappingURL=confetti.js.map