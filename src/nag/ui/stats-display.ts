import { createElement, setText } from "./dom.js";
import { formatSeconds } from "./format.js";
import type { LevelStats } from "./stats-store.js";

export class StatsDisplayUI {
  readonly #root: HTMLElement;
  readonly #lastScore: HTMLElement;
  readonly #lastTime: HTMLElement;
  readonly #bestScore: HTMLElement;
  readonly #bestTime: HTMLElement;
  readonly #played: HTMLElement;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#root.classList.add("nag-stats-panel");

    this.#lastScore = createElement("dd", "nag-stats-value nag-stats-last-score", "-");
    this.#lastTime = createElement("dd", "nag-stats-value nag-stats-last-time", "-");
    this.#bestScore = createElement("dd", "nag-stats-value nag-stats-best-score", "-");
    this.#bestTime = createElement("dd", "nag-stats-value nag-stats-best-time", "-");
    this.#played = createElement("dd", "nag-stats-value nag-stats-played", "0");

    const title = createElement("h2", "nag-stats-title", "Your record");
    const list = createElement("dl", "nag-stats-list");
    list.append(
      this.#statRow("Last", this.#lastScore, this.#lastTime),
      this.#statRow("Best", this.#bestScore, this.#bestTime),
      this.#statRow("Games", this.#played),
    );
    this.#root.append(title, list);
  }

  render(stats: LevelStats): void {
    const played = stats.gamesPlayed > 0;
    setText(this.#lastScore, played ? String(stats.lastScore) : "-");
    setText(this.#lastTime, played ? formatSeconds(stats.lastTimeMs) : "-");
    setText(this.#bestScore, stats.bestScore === null ? "-" : String(stats.bestScore));
    setText(this.#bestTime, stats.bestTimeMs === null ? "-" : formatSeconds(stats.bestTimeMs));
    setText(this.#played, String(stats.gamesPlayed));
  }

  #statRow(label: string, ...values: HTMLElement[]): HTMLElement {
    const row = createElement("div", "nag-stats-row");
    row.append(createElement("dt", "nag-stats-caption", label));
    row.append(...values);
    return row;
  }
}
