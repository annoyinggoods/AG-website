import type { HistoryEntry } from "./history-store.js";
import { createElement } from "./dom.js";
import { formatSeconds } from "./format.js";

export class HistoryUI {
  readonly #root: HTMLElement;
  readonly #body: HTMLElement;
  readonly #empty: HTMLElement;
  readonly #clearButton: HTMLButtonElement;

  constructor(root: HTMLElement, onClear: () => void) {
    this.#root = root;
    this.#root.classList.add("nag-history-panel");

    const title = createElement("h2", "nag-history-title", "Previous games");

    this.#clearButton = createElement("button", "nag-button nag-button-quiet", "Clear history");
    this.#clearButton.type = "button";
    this.#clearButton.addEventListener("click", () => onClear());

    const header = createElement("div", "nag-history-header");
    header.append(title, this.#clearButton);

    const table = createElement("table", "nag-history-table");
    const thead = createElement("thead");
    const headRow = createElement("tr");
    for (const label of ["Level", "Time", "Score", "Date played", "Progress"]) {
      const cell = createElement("th", "nag-history-th", label);
      cell.scope = "col";
      headRow.append(cell);
    }
    thead.append(headRow);

    this.#body = createElement("tbody", "nag-history-body");
    this.#empty = createElement("p", "nag-history-empty", "No games played yet.");

    table.append(thead, this.#body);

    const scroll = createElement("div", "nag-history-scroll");
    // The table is wider than a phone, so the region scrolls sideways. A
    // scrolling region has to be reachable with the keyboard, or a keyboard
    // player cannot reach the columns that do not fit.
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Previous games, scrolls sideways");
    scroll.append(table);

    this.#root.append(header, scroll, this.#empty);
  }

  render(entries: readonly HistoryEntry[]): void {
    if (entries.length === 0) {
      this.#body.replaceChildren();
      this.#empty.hidden = false;
      this.#clearButton.hidden = true;
      return;
    }
    this.#empty.hidden = true;
    this.#clearButton.hidden = false;
    const rows = entries.map((entry) => this.#rowFor(entry));
    this.#body.replaceChildren(...rows);
  }

  #rowFor(entry: HistoryEntry): HTMLTableRowElement {
    const row = createElement("tr", "nag-history-row");
    row.dataset.levelId = String(entry.levelId);
    row.dataset.won = String(entry.won);

    const level = createElement("td", "nag-history-td", `Level ${entry.levelId}`);
    const time = createElement("td", "nag-history-td nag-history-time", formatSeconds(entry.timeMs));
    const score = createElement("td", "nag-history-td nag-history-score", String(entry.score));
    const date = createElement("td", "nag-history-td", formatDate(entry.playedAtMs));
    const progress = createElement(
      "td",
      "nag-history-td nag-history-progress",
      `${entry.progress}/${entry.unitCount}${entry.won ? " won" : ""}`,
    );

    if (!entry.won) {
      score.classList.add("is-negative");
    }

    row.append(level, time, score, date, progress);
    return row;
  }
}

export function formatDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
