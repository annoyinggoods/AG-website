import { createElement } from "./dom.js";

export interface ShellOptions {
  /**
   * The site page carries its own heading for the game, so the game can leave
   * its own title out and keep only the tagline.
   */
  readonly showTitle?: boolean;
}

export interface ShellElements {
  readonly title: HTMLElement | null;
  readonly instructions: HTMLElement;
  readonly hud: HTMLElement;
  readonly stats: HTMLElement;
  readonly status: HTMLElement;
  readonly order: HTMLElement;
  readonly orderPopup: HTMLElement;
  readonly board: HTMLElement;
  readonly reveal: HTMLElement;
  readonly controls: HTMLElement;
  readonly screen: HTMLElement;
  readonly history: HTMLElement;
}

export function buildShell(root: HTMLElement, options: ShellOptions = {}): ShellElements {
  const showTitle = options.showTitle ?? true;
  root.classList.add("nag-shell");

  const header = createElement("header", "nag-header");
  const title = showTitle ? createElement("h1", "nag-title", "nAG") : null;
  const tagline = createElement(
    "p",
    "nag-tagline",
    "Game that nags 'Make no mistakes'. Scout the board, train memory, deliver unbroken streak to win. So hardcore it's annoying-good.",
  );
  header.append(...(title === null ? [] : [title]), tagline);

  const instructions = createElement("section", "nag-instructions-region");
  instructions.setAttribute("aria-label", "How to play");

  const hud = createElement("section", "nag-hud-region");
  hud.setAttribute("aria-label", "Game status");

  const stats = createElement("section", "nag-stats-region");
  stats.setAttribute("aria-label", "Your record for this level");

  const status = createElement("section", "nag-status-region");
  status.setAttribute("aria-label", "Latest message");

  const order = createElement("section", "nag-order-region");
  order.setAttribute("aria-label", "Order to play");

  const orderPopup = createElement("section", "nag-order-popup-region");
  orderPopup.setAttribute("aria-label", "The order to play");

  const board = createElement("section", "nag-board-region");
  board.setAttribute("aria-label", "Card board");

  const reveal = createElement("section", "nag-reveal-region");
  reveal.setAttribute("aria-label", "Reveal the order");

  const controls = createElement("section", "nag-controls-region");
  const screen = createElement("section", "nag-screen-region");
  screen.setAttribute("aria-label", "Result");

  const history = createElement("section", "nag-history-region");
  history.setAttribute("aria-label", "Previous games");

  root.replaceChildren(
    header,
    instructions,
    hud,
    stats,
    status,
    order,
    orderPopup,
    board,
    reveal,
    controls,
    screen,
    history,
  );
  return {
    title,
    instructions,
    hud,
    stats,
    status,
    order,
    orderPopup,
    board,
    reveal,
    controls,
    screen,
    history,
  };
}
