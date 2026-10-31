import type { Deal, FlipOutcome } from "../engine/types.js";
import { createElement, setText } from "./dom.js";
import { unitFaceLabel } from "./format.js";

export type StatusTone = "info" | "warning" | "good";

export interface StatusMessage {
  readonly text: string;
  readonly tone: StatusTone;
}

export class StatusUI {
  readonly #root: HTMLElement;
  readonly #liveRegion: HTMLElement;
  #current: StatusMessage = { text: "", tone: "info" };

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#root.classList.add("nag-status");
    this.#liveRegion = createElement("p", "nag-status-text");
    this.#liveRegion.setAttribute("role", "status");
    this.#liveRegion.setAttribute("aria-live", "polite");
    this.#root.append(this.#liveRegion);
  }

  show(message: StatusMessage): void {
    this.#current = message;
    setText(this.#liveRegion, message.text);
    this.#root.dataset.tone = message.tone;
  }

  clear(): void {
    this.#current = { text: "", tone: "info" };
    setText(this.#liveRegion, "");
    this.#root.dataset.tone = "info";
  }

  get message(): StatusMessage {
    return this.#current;
  }
}

export function statusForOutcome(outcome: FlipOutcome, deal: Deal, noun: string): StatusMessage | null {
  switch (outcome.kind) {
    case "scout-ended": {
      const label = unitFaceLabel(deal, outcome.anchorUnitId);
      return {
        text: `Scout over. ${label} is your anchor. Cards hide in 4 seconds, or turn a card now to start the run straight away.`,
        tone: "info",
      };
    }
    case "scout-cap-reset":
      return {
        text: "Scout limit reached. The board hides penalty-free and the scout starts again.",
        tone: "warning",
      };
    case "run-failed":
      if (!outcome.penalized) {
        return {
          text: "Wrong card, but it was the first time you turned it over, so no points lost. The board hides in 4 seconds, then the run restarts at the anchor.",
          tone: "info",
        };
      }
      return {
        text: "Wrong card. -1 point. The board hides in 4 seconds, then the run restarts at the anchor.",
        tone: "warning",
      };
    case "unit-completed":
      if (outcome.won) {
        return { text: "Perfect run. You won the level.", tone: "good" };
      }
      return {
        text: outcome.pointAwarded
          ? `${noun} complete. +1 point.`
          : `${noun} complete. No extra point, it was already scored.`,
        tone: "good",
      };
    case "scout-reveal":
    case "run-reveal":
    case "rejected":
      return null;
    default:
      return null;
  }
}
