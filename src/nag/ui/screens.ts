import type { GameState, LevelConfig } from "../engine/types.js";
import { createElement, setText } from "./dom.js";
import { formatSeconds } from "./format.js";
import { unitNoun } from "./instructions.js";

export interface ScreenCallbacks {
  readonly onPlayAgain: () => void;
  readonly onNextLevel: () => void;
  readonly onRetry: () => void;
}

export class ScreensUI {
  readonly #root: HTMLElement;
  readonly #panel: HTMLElement;
  readonly #title: HTMLElement;
  readonly #summary: HTMLElement;
  readonly #details: HTMLElement;
  readonly #playAgain: HTMLButtonElement;
  readonly #nextLevel: HTMLButtonElement;
  readonly #retry: HTMLButtonElement;
  readonly #callbacks: ScreenCallbacks;

  constructor(root: HTMLElement, callbacks: ScreenCallbacks) {
    this.#root = root;
    this.#callbacks = callbacks;

    this.#panel = createElement("div", "nag-screen");
    this.#panel.hidden = true;

    this.#title = createElement("h2", "nag-screen-title");
    this.#summary = createElement("p", "nag-screen-summary");
    this.#details = createElement("p", "nag-screen-details");

    this.#playAgain = createElement("button", "nag-button nag-button-primary", "Play again");
    this.#playAgain.type = "button";
    this.#playAgain.addEventListener("click", () => this.#callbacks.onPlayAgain());

    this.#nextLevel = createElement("button", "nag-button nag-button-secondary", "Next level");
    this.#nextLevel.type = "button";
    this.#nextLevel.addEventListener("click", () => this.#callbacks.onNextLevel());

    this.#retry = createElement("button", "nag-button nag-button-primary", "Try again");
    this.#retry.type = "button";
    this.#retry.addEventListener("click", () => this.#callbacks.onRetry());

    const actions = createElement("div", "nag-screen-actions");
    actions.append(this.#playAgain, this.#nextLevel, this.#retry);

    this.#panel.append(this.#summary, this.#details, actions);
    this.#root.append(this.#panel);
  }

  showWin(state: GameState, level: LevelConfig, hasNextLevel: boolean): void {
    const noun = unitNoun(level);
    this.#showTitle("You win");
    setText(
      this.#summary,
      `All ${state.unitCount} ${noun.toLowerCase()}s completed in one perfect run.`,
    );
    setText(
      this.#details,
      `Score ${state.score} - Time ${formatSeconds(state.elapsedMs)}`,
    );
    this.#playAgain.hidden = false;
    this.#nextLevel.hidden = !hasNextLevel;
    this.#retry.hidden = true;
    this.#panel.hidden = false;
    this.#panel.dataset.screen = "win";
  }

  showFail(state: GameState, level: LevelConfig): void {
    const noun = unitNoun(level);
    this.#showTitle("Out of time");
    setText(
      this.#summary,
      `The countdown ran out before you finished every ${noun.toLowerCase()}.`,
    );
    setText(this.#details, `Score ${state.score}`);
    this.#playAgain.hidden = true;
    this.#nextLevel.hidden = true;
    this.#retry.hidden = false;
    this.#panel.hidden = false;
    this.#panel.dataset.screen = "fail";
  }

  hide(): void {
    this.#panel.hidden = true;
    this.#panel.dataset.screen = "";
    this.#title.remove();
  }

  /**
   * The heading only goes into the panel while it carries the name of the
   * screen, so the page never holds a heading with no text in it.
   */
  #showTitle(text: string): void {
    setText(this.#title, text);
    if (this.#title.parentElement !== this.#panel) {
      this.#panel.prepend(this.#title);
    }
  }
}
