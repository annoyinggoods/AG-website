import type { GameEngine } from "../engine/run-state.js";
import type { Deal, GameState, LevelConfig } from "../engine/types.js";

const SKULL_BACK = "☠️";

export class BoardUI {
  readonly #root: HTMLElement;
  readonly #board: HTMLDivElement;
  readonly #cards = new Map<number, HTMLButtonElement>();
  #engine: GameEngine | null = null;
  #deal: Deal | null = null;
  #revealAll = false;
  #unsubscribe: (() => void) | null = null;
  #cols = 1;
  #rows = 1;
  #focusIndex = 0;
  #hadFocus = false;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#board = document.createElement("div");
    this.#board.className = "nag-board";
    this.#board.setAttribute("role", "group");
    this.#root.replaceChildren(this.#board);
    this.#board.addEventListener("pointerup", (event) => {
      this.#handlePointerUp(event);
    });
    this.#board.addEventListener("click", (event) => {
      this.#handleKeyboardClick(event);
    });
    this.#board.addEventListener("keydown", (event) => {
      this.#handleKeyDown(event);
    });
    this.#board.addEventListener("focusin", (event) => {
      this.#handleFocusIn(event);
    });
  }

  mount(level: LevelConfig, deal: Deal, engine: GameEngine): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#engine = engine;
    this.#deal = deal;
    this.#revealAll = false;
    this.#cards.clear();
    this.#focusIndex = 0;
    this.#cols = level.cols;
    this.#rows = level.rows;

    this.#board.style.gridTemplateColumns = `repeat(${level.cols}, minmax(0, 1fr))`;
    this.#board.style.gridTemplateRows = `repeat(${level.rows}, minmax(0, 1fr))`;
    this.#board.setAttribute("aria-label", `Board for level ${level.id}`);
    this.#board.dataset.level = String(level.id);

    this.#createCards();
    this.#unsubscribe = engine.subscribe(() => this.#syncBoard());
    this.#syncBoard();
    this.#applyRovingTabindex();
    this.#restoreFocus();
  }

  unmount(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#engine = null;
    this.#deal = null;
    this.#cards.clear();
    this.#focusIndex = 0;
    this.#cols = 1;
    this.#rows = 1;
    // The cards are about to be removed from the document, so remember
    // whether the player was on the board and put them back afterwards.
    this.#hadFocus = this.#board.contains(document.activeElement);
    this.#board.replaceChildren();
  }

  /**
   * Puts the focus on the first card, so the player can carry straight on
   * playing after the board has been rebuilt.
   */
  focusFirstCard(): void {
    this.#focusIndex = 0;
    this.#applyRovingTabindex();
    this.#cards.get(0)?.focus();
  }

  #restoreFocus(): void {
    if (!this.#hadFocus) {
      return;
    }
    this.#hadFocus = false;
    this.focusFirstCard();
  }

  revealAll(): void {
    this.#revealAll = true;
    this.#syncBoard();
  }

  render(): void {
    this.#syncBoard();
  }

  #handlePointerUp(event: PointerEvent): void {
    const button = this.#cardFromEvent(event);
    if (button === null) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    this.#flipCard(button);
  }

  #handleKeyboardClick(event: MouseEvent): void {
    if (event.detail !== 0) {
      return;
    }
    const button = this.#cardFromEvent(event);
    if (button === null) {
      return;
    }
    this.#flipCard(button);
  }

  #cardFromEvent(event: Event): HTMLButtonElement | null {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    const button = target.closest("button.nag-card");
    return button instanceof HTMLButtonElement ? button : null;
  }

  /**
   * The arrow keys move the focus around the grid. The roving tab stop moves
   * with it, so the board is always a single stop in the tab order.
   */
  #handleKeyDown(event: KeyboardEvent): void {
    const target = this.#cardFromEvent(event);
    if (target === null) {
      return;
    }
    const next = this.#nextIndexForKey(event.key, Number(target.dataset.cardId));
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.#focusIndex = next;
    this.#applyRovingTabindex();
    this.#cards.get(next)?.focus();
  }

  #nextIndexForKey(key: string, fromIndex: number): number | null {
    const column = fromIndex % this.#cols;
    const row = Math.floor(fromIndex / this.#cols);
    switch (key) {
      case "ArrowLeft":
        return column > 0 ? fromIndex - 1 : fromIndex;
      case "ArrowRight":
        return column < this.#cols - 1 ? fromIndex + 1 : fromIndex;
      case "ArrowUp":
        return row > 0 ? fromIndex - this.#cols : fromIndex;
      case "ArrowDown":
        return row < this.#rows - 1 ? fromIndex + this.#cols : fromIndex;
      case "Home":
        return row * this.#cols;
      case "End":
        return row * this.#cols + (this.#cols - 1);
      default:
        return null;
    }
  }

  /**
   * A click or a pointer landing on a card moves the roving tab stop onto it,
   * so the keyboard picks up where the pointer left off.
   */
  #handleFocusIn(event: FocusEvent): void {
    const target = this.#cardFromEvent(event);
    if (target === null) {
      return;
    }
    const cardId = Number(target.dataset.cardId ?? "");
    if (!Number.isInteger(cardId)) {
      return;
    }
    if (cardId === this.#focusIndex) {
      return;
    }
    this.#focusIndex = cardId;
    this.#applyRovingTabindex();
  }

  #applyRovingTabindex(): void {
    for (const [cardId, button] of this.#cards) {
      button.tabIndex = cardId === this.#focusIndex ? 0 : -1;
    }
  }

  #flipCard(button: HTMLButtonElement): void {
    const cardId = Number(button.dataset.cardId ?? "");
    if (!Number.isInteger(cardId)) {
      return;
    }
    this.#engine?.flip(cardId);
  }

  #createCards(): void {
    const deal = this.#deal;
    if (deal === null) {
      return;
    }
    for (const card of deal.cards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nag-card";
      button.dataset.cardId = String(card.id);
      button.dataset.face = card.face;

      const inner = document.createElement("span");
      inner.className = "nag-card-inner";

      const back = document.createElement("span");
      back.className = "nag-card-face nag-card-back";
      back.setAttribute("aria-hidden", "true");
      back.textContent = SKULL_BACK;

      const front = document.createElement("span");
      front.className = "nag-card-face nag-card-front";
      front.setAttribute("aria-hidden", "true");
      front.textContent = card.face;

      inner.append(back, front);
      button.append(inner);
      this.#board.append(button);
      this.#cards.set(card.id, button);
    }
  }

  #syncBoard(): void {
    const engine = this.#engine;
    const deal = this.#deal;
    if (engine === null || deal === null) {
      return;
    }
    const state = engine.getState();
    const locked = this.#isLocked(state);
    this.#board.classList.toggle("is-locked", locked);
    this.#board.classList.toggle("is-all-revealed", this.#revealAll);
    this.#board.classList.toggle("is-live", state.phase === "Linger");

    for (const card of deal.cards) {
      const button = this.#cards.get(card.id);
      if (button === undefined) {
        continue;
      }
      const revealed = this.#revealAll || state.revealedCardIds.includes(card.id);
      button.classList.toggle("is-revealed", revealed);
      button.classList.toggle("is-locked", locked);
      // The locked state uses aria-disabled rather than the disabled
      // attribute, because a natively disabled button drops out of the focus
      // order and the player loses their place in the grid.
      button.setAttribute("aria-disabled", locked ? "true" : "false");
      button.setAttribute("aria-pressed", revealed ? "true" : "false");
      const face = button.querySelector(".nag-card-front");
      const back = button.querySelector(".nag-card-back");
      if (face instanceof HTMLElement) {
        face.textContent = card.face;
      }
      if (back instanceof HTMLElement) {
        back.textContent = SKULL_BACK;
      }
      button.title = revealed ? `Card ${card.face}` : "Hidden card";
      // The accessible name carries the face rather than the board position,
      // because a name that omits the visible text of the card is a WCAG
      // failure. The face is hidden from sight while the card is face down,
      // so the name and the visible text stay in step.
      button.setAttribute(
        "aria-label",
        revealed ? `Revealed card ${card.face}` : `Hidden card ${card.face}`,
      );
    }
  }

  #isLocked(state: GameState): boolean {
    if (state.phase === "Idle" || state.phase === "Win" || state.phase === "Failed") {
      return true;
    }
    return state.popup?.open === true;
  }
}
