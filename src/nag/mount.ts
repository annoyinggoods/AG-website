/**
 * The container the game mounts into. The site page carries the heading and
 * the page chrome, and the game fills this one container inside it.
 */
export const MOUNT_SELECTOR = "#nag-app";

/**
 * The element that holds the game, which the order popup makes inert around
 * itself.
 */
export function findAppRoot(): HTMLElement | null {
  const app = document.querySelector(MOUNT_SELECTOR);
  return app instanceof HTMLElement ? app : null;
}

/**
 * Brings the game into view.
 *
 * The game lives inside a long page here, so the board can sit above or
 * below the fold. The scroll is made instant, because the site scrolls
 * smoothly and a smooth scroll takes long enough for the game clock to run
 * on before the player has even seen the board.
 */
export function scrollGameIntoView(target: HTMLElement): void {
  target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
}
