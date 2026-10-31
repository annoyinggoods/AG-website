import { createLevel } from "../engine/levels.js";
import { GameEngine } from "../engine/run-state.js";
import { buildDeal, createCryptoRandom } from "../engine/shuffle.js";
import type { Deal, EngineEvent, FlipOutcome, GameState, LevelConfig } from "../engine/types.js";
import { scrollGameIntoView } from "../mount.js";
import { BoardUI } from "./board.js";
import { fireConfetti } from "./confetti.js";
import { createElement } from "./dom.js";
import { HistoryUI } from "./history.js";
import { createHistoryStore, createLocalHistoryStorage, type HistoryStore } from "./history-store.js";
import { HudUI } from "./hud.js";
import { InstructionsUI, unitNoun } from "./instructions.js";
import { OrderPopupUI } from "./order-popup.js";
import { OrderStripUI } from "./order-strip.js";
import { ScreensUI } from "./screens.js";
import type { ShellElements } from "./shell.js";
import { StatsDisplayUI } from "./stats-display.js";
import { createLocalStatsStorage, createStatsStore, type StatsStore } from "./stats-store.js";
import { StatusUI, statusForOutcome } from "./status.js";

const TICK_INTERVAL_MS = 100;

export interface AppLevelOption {
  readonly id: number;
  readonly label: string;
}

const LEVEL_OPTIONS: readonly AppLevelOption[] = [
  { id: 1, label: "Level 1 - 4x4" },
  { id: 2, label: "Level 2 - 6x6" },
  { id: 3, label: "Level 3 - 4x4 countdown" },
  { id: 4, label: "Level 4 - 5x5 fixed order" },
  { id: 5, label: "Level 5 - 6x6 letter pairs" },
  { id: 6, label: "Level 6 - 5x5 memorized order" },
];

export class App {
  readonly #instructions: InstructionsUI;
  readonly #hud: HudUI;
  readonly #status: StatusUI;
  readonly #order: OrderStripUI;
  readonly #orderPopup: OrderPopupUI;
  readonly #board: BoardUI;
  readonly #screens: ScreensUI;
  readonly #history: HistoryUI;
  readonly #historyStore: HistoryStore;
  readonly #stats: StatsDisplayUI;
  readonly #statsStore: StatsStore;
  readonly #playButton: HTMLButtonElement;
  readonly #restartButton: HTMLButtonElement;
  readonly #revealButton: HTMLButtonElement;
  readonly #boardRoot: HTMLElement;
  #levelId: number;
  #level: LevelConfig;
  #deal: Deal;
  #engine: GameEngine;
  #unsubscribe: (() => void) | null = null;
  #timerHandle: number | null = null;
  #lingerHandle: number | null = null;

  constructor(shell: ShellElements) {
    this.#levelId = LEVEL_OPTIONS[0]!.id;
    this.#level = createLevel(this.#levelId, createCryptoRandom());
    this.#deal = buildDeal(this.#level, createCryptoRandom());
    this.#engine = new GameEngine(this.#level, this.#deal, () => Date.now());
    this.#historyStore = createHistoryStore(createLocalHistoryStorage());
    this.#statsStore = createStatsStore(createLocalStatsStorage());

    this.#instructions = new InstructionsUI(shell.instructions);
    this.#status = new StatusUI(shell.status);
    this.#order = new OrderStripUI(shell.order);
    this.#orderPopup = new OrderPopupUI(shell.orderPopup, {
      onClose: () => this.#closeOrderPopup(),
    });
    this.#board = new BoardUI(shell.board);
    this.#boardRoot = shell.board;
    this.#hud = new HudUI(shell.hud, LEVEL_OPTIONS, {
      onSelectLevel: (levelId) => this.#selectLevel(levelId),
    });
    this.#screens = new ScreensUI(shell.screen, {
      onPlayAgain: () => this.#startGame(),
      onNextLevel: () => this.#goToNextLevel(),
      onRetry: () => this.#startGame(),
    });
    this.#history = new HistoryUI(shell.history, () => this.#clearHistory());
    this.#stats = new StatsDisplayUI(shell.stats);

    this.#playButton = createElement("button", "nag-button nag-button-primary nag-play", "PLAY");
    this.#playButton.type = "button";
    this.#playButton.addEventListener("click", () => this.#startGame());

    this.#restartButton = createElement(
      "button",
      "nag-button nag-button-secondary nag-restart",
      "RESTART",
    );
    this.#restartButton.type = "button";
    this.#restartButton.addEventListener("click", () => this.#restart());

    this.#revealButton = createElement(
      "button",
      "nag-button nag-button-secondary nag-reveal-order",
      "REVEAL THE ORDER",
    );
    this.#revealButton.type = "button";
    this.#revealButton.addEventListener("click", () => this.#openOrderPopup());
    this.#revealButton.hidden = true;

    shell.reveal.replaceChildren(this.#revealButton);
    shell.controls.replaceChildren(this.#playButton, this.#restartButton);

    this.#bindEngine();
    this.#enterIdleState();
    this.#renderHistory();
    this.#renderStats();
  }

  #bindEngine(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = this.#engine.subscribe((event) => this.#handleEngineEvent(event));
  }

  #enterIdleState(): void {
    this.#stopTimer();
    this.#screens.hide();
    // A new attempt drops the popup, so the page has to be given back before
    // the new board is built.
    this.#orderPopup.dismiss();
    this.#newAttempt();
    this.#instructions.render(this.#level);
    this.#hud.resetDeductionFlash();
    this.#status.clear();
    this.#renderHud();
    this.#renderStats();
    this.#playButton.hidden = false;
    this.#playButton.disabled = false;
    this.#hud.levelSelect.disabled = false;
    this.#restartButton.hidden = true;
  }

  #startGame(): void {
    this.#stopTimer();
    this.#screens.hide();
    this.#orderPopup.dismiss();
    this.#newAttempt();
    this.#hud.resetDeductionFlash();
    this.#status.clear();
    this.#playButton.hidden = true;
    this.#hud.levelSelect.disabled = true;
    this.#restartButton.hidden = false;
    // The board has to be on screen before the clock starts, so the player
    // does not lose the first seconds of the run to a scroll.
    scrollGameIntoView(this.#boardRoot);
    this.#engine.start();
    this.#renderHud();
    this.#startTimer();
  }

  #restart(): void {
    this.#stopTimer();
    this.#screens.hide();
    this.#orderPopup.dismiss();
    this.#newAttempt();
    this.#hud.resetDeductionFlash();
    this.#status.clear();
    this.#playButton.hidden = false;
    this.#playButton.disabled = false;
    this.#hud.levelSelect.disabled = false;
    this.#restartButton.hidden = true;
    this.#renderHud();  }

  #newAttempt(): void {
    this.#board.unmount();
    this.#level = createLevel(this.#levelId, createCryptoRandom());
    this.#deal = buildDeal(this.#level, createCryptoRandom());
    this.#engine = new GameEngine(this.#level, this.#deal, () => Date.now());
    this.#bindEngine();
    this.#board.mount(this.#level, this.#deal, this.#engine);
  }

  #selectLevel(levelId: number): void {
    this.#levelId = levelId;
    this.#enterIdleState();
  }

  #goToNextLevel(): void {
    const nextId = this.#nextLevelId();
    if (nextId === null) {
      this.#enterIdleState();
      return;
    }
    this.#levelId = nextId;
    this.#enterIdleState();
    this.#playButton.focus();
  }

  #openOrderPopup(): void {
    if (!this.#engine.openOrderPopup()) {
      return;
    }
    this.#status.show({
      text: "The order is open. The clock keeps running.",
      tone: "warning",
    });
    this.#renderHud();
  }

  #closeOrderPopup(): void {
    const charged = this.#engine.closeOrderPopup();
    if (charged > 0) {
      this.#status.show({
        text: `Closed. Looking at the order cost ${charged} point${charged === 1 ? "" : "s"}.`,
        tone: "warning",
      });
    }
    this.#renderHud();
  }

  #startTimer(): void {
    this.#stopTimer();
    this.#timerHandle = window.setInterval(() => {
      this.#engine.tick();
      this.#renderHud();
    }, TICK_INTERVAL_MS);
  }

  #stopTimer(): void {
    if (this.#timerHandle !== null) {
      window.clearInterval(this.#timerHandle);
      this.#timerHandle = null;
    }
    if (this.#lingerHandle !== null) {
      window.clearTimeout(this.#lingerHandle);
      this.#lingerHandle = null;
    }
  }

  #scheduleLingerHide(): void {
    if (this.#lingerHandle !== null) {
      window.clearTimeout(this.#lingerHandle);
      this.#lingerHandle = null;
    }
    const hideAfterMs = this.#engine.getState().lingerHideAfterMs;
    if (hideAfterMs === null) {
      return;
    }
    const delay = Math.max(0, hideAfterMs - Date.now());
    this.#lingerHandle = window.setTimeout(() => {
      this.#lingerHandle = null;
      this.#engine.tick();
      this.#renderHud();
    }, delay);
  }

  #handleEngineEvent(event: EngineEvent): void {
    if (event.type === "flip") {
      this.#handleFlipOutcome(event.outcome);
    }
    if (event.type === "won") {
      this.#handleWin();
    }
    if (event.type === "failed") {
      this.#handleFail();
    }
    this.#renderHud();
    this.#scheduleLingerHide();
  }

  #handleFlipOutcome(outcome: FlipOutcome): void {
    const state = this.#engine.getState();
    if (state.phase === "Win" || state.phase === "Failed") {
      return;
    }
    const message = statusForOutcome(outcome, this.#deal, unitNoun(this.#level));
    if (message !== null) {
      this.#status.show(message);
    }
  }

  #handleWin(): void {
    this.#stopTimer();
    this.#board.revealAll();
    this.#status.show({ text: "Perfect run. You won the level.", tone: "good" });
    const state = this.#engine.getState();
    this.#screens.showWin(state, this.#level, this.#nextLevelId() !== null);
    this.#hud.levelSelect.disabled = false;
    this.#recordHistory(state, true);
    this.#recordStats(state, true);
  }

  #handleFail(): void {
    this.#stopTimer();
    this.#board.revealAll();
    this.#status.show({ text: "Out of time. The attempt failed.", tone: "warning" });
    const state = this.#engine.getState();
    this.#screens.showFail(state, this.#level);
    this.#hud.levelSelect.disabled = false;
    this.#recordHistory(state, false);
    this.#recordStats(state, false);
  }

  #recordStats(state: GameState, won: boolean): void {
    const result = this.#statsStore.record(this.#level.id, {
      score: state.score,
      timeMs: state.elapsedMs,
      won,
    });
    this.#renderStats();
    if (!won) {
      return;
    }
    if (result.isNewBestScore || result.isNewBestTime) {
      fireConfetti().catch(() => undefined);
    }
  }

  #renderStats(): void {
    this.#stats.render(this.#statsStore.statsFor(this.#level.id));
  }

  #recordHistory(state: GameState, won: boolean): void {
    this.#historyStore.record({
      levelId: this.#level.id,
      timeMs: state.elapsedMs,
      score: state.score,
      playedAtMs: Date.now(),
      progress: state.completedUnitIds.length,
      unitCount: state.unitCount,
      won,
    });
    this.#renderHistory();
  }

  #renderHistory(): void {
    this.#history.render(this.#historyStore.list());
  }

  #clearHistory(): void {
    this.#historyStore.clear();
    this.#renderHistory();
  }

  #nextLevelId(): number | null {
    const currentIndex = LEVEL_OPTIONS.findIndex((option) => option.id === this.#levelId);
    const next = LEVEL_OPTIONS[currentIndex + 1];
    return next === undefined ? null : next.id;
  }

  #renderHud(): void {
    const state: GameState = this.#engine.getState();
    this.#hud.render(state, this.#level);
    this.#renderOrder(state);
    // The reveal button is rendered before the popup, because the popup hands
    // the focus back to that button when it closes, and a disabled button
    // cannot take the focus.
    this.#renderRevealButton(state);
    this.#orderPopup.render(state, this.#deal);
  }

  #renderOrder(state: GameState): void {
    if (!this.#showsOrderStrip(state)) {
      this.#order.hide();
      return;
    }
    this.#order.render(state, this.#deal);
  }

  #showsOrderStrip(state: GameState): boolean {
    const rule = this.#level.orderPopup;
    if (rule === null) {
      return true;
    }
    if (rule.kind === "metered") {
      return false;
    }
    return state.completedUnitIds.length < rule.stripRetireAfterPairs;
  }

  #renderRevealButton(state: GameState): void {
    const rule = this.#level.orderPopup;
    const popupOpen = state.popup?.open === true;
    const gameOver = state.phase === "Win" || state.phase === "Failed";
    const notStarted = state.phase === "Idle";
    const available = rule !== null && !popupOpen && !gameOver && !notStarted;
    this.#revealButton.hidden = rule === null;
    this.#revealButton.disabled = !available;
  }
}
