import { countPassedMarks } from "../engine/timer-model.js";
import type { GameState, GamePhase, LevelConfig } from "../engine/types.js";
import { createElement, setText } from "./dom.js";
import { formatCountdown, formatSeconds } from "./format.js";
import { unitNoun } from "./instructions.js";

export interface HudLevelOption {
  readonly id: number;
  readonly label: string;
}

export interface HudCallbacks {
  readonly onSelectLevel: (levelId: number) => void;
}

const ACTIVE_PHASES: readonly GamePhase[] = ["Scout", "Linger", "Run"];

export class HudUI {
  readonly #root: HTMLElement;
  readonly #levelSelect: HTMLSelectElement;
  readonly #scoreValue: HTMLElement;
  readonly #timeValue: HTMLElement;
  readonly #timeCaption: HTMLElement;
  readonly #progressValue: HTMLElement;
  readonly #phaseValue: HTMLElement;
  readonly #viewCostGroup: HTMLElement;
  readonly #viewCostValue: HTMLElement;
  readonly #viewTimeGroup: HTMLElement;
  readonly #viewTimeValue: HTMLElement;
  readonly #deductionBadge: HTMLElement;
  readonly #callbacks: HudCallbacks;
  #passedMarks = 0;

  constructor(root: HTMLElement, levels: readonly HudLevelOption[], callbacks: HudCallbacks) {
    this.#root = root;
    this.#callbacks = callbacks;
    this.#root.classList.add("nag-hud");

    this.#levelSelect = createElement("select", "nag-hud-level-select");
    this.#levelSelect.setAttribute("aria-label", "Choose level");
    for (const level of levels) {
      const option = createElement("option", "nag-hud-level-option", level.label);
      option.value = String(level.id);
      this.#levelSelect.append(option);
    }
    this.#levelSelect.addEventListener("change", () => {
      const chosen = Number(this.#levelSelect.value);
      if (Number.isInteger(chosen)) {
        this.#callbacks.onSelectLevel(chosen);
      }
    });

    this.#scoreValue = createElement("span", "nag-hud-value nag-hud-score", "0");
    this.#scoreValue.setAttribute("role", "status");
    this.#scoreValue.setAttribute("aria-live", "polite");
    this.#timeValue = createElement("span", "nag-hud-value nag-hud-time", "0:00");
    this.#timeCaption = createElement("span", "nag-hud-caption nag-hud-time-caption", "Elapsed");
    this.#progressValue = createElement("span", "nag-hud-value nag-hud-progress", "Pair 0/8");
    this.#phaseValue = createElement("span", "nag-hud-value nag-hud-phase", "Idle");
    this.#deductionBadge = createElement("span", "nag-hud-deduction", "");
    this.#deductionBadge.setAttribute("role", "status");
    this.#deductionBadge.setAttribute("aria-live", "polite");

    const timeGroup = this.#hudGroup("Time", this.#timeValue, this.#timeCaption);
    timeGroup.append(this.#deductionBadge);

    this.#viewCostValue = createElement("span", "nag-hud-value nag-hud-viewcost", "0");
    this.#viewCostGroup = this.#hudGroup("View cost", this.#viewCostValue);

    this.#viewTimeValue = createElement("span", "nag-hud-value nag-hud-viewtime", "0:00");
    this.#viewTimeGroup = this.#hudGroup("View time", this.#viewTimeValue);

    this.#root.replaceChildren(
      this.#hudGroup("Level", this.#levelSelect),
      this.#hudGroup("Score", this.#scoreValue),
      timeGroup,
      this.#hudGroup("Progress", this.#progressValue),
      this.#hudGroup("Phase", this.#phaseValue),
      this.#viewCostGroup,
      this.#viewTimeGroup,
    );
  }

  #hudGroup(label: string, value: HTMLElement, caption?: HTMLElement): HTMLElement {
    const group = createElement("div", "nag-hud-group");
    group.append(createElement("span", "nag-hud-caption", label));
    group.append(value);
    if (caption !== undefined) {
      group.append(caption);
    }
    return group;
  }

  get levelSelect(): HTMLSelectElement {
    return this.#levelSelect;
  }

  setLevel(levelId: number): void {
    this.#levelSelect.value = String(levelId);
    this.#root.dataset.level = String(levelId);
  }

  render(state: GameState, level: LevelConfig): void {
    this.setLevel(state.levelId);

    setText(this.#scoreValue, String(state.score));
    this.#scoreValue.classList.toggle("is-negative", state.score < 0);

    if (level.timeRule.kind === "countdown" && state.countdownRemainingMs !== null) {
      setText(this.#timeCaption, "Remaining");
      setText(this.#timeValue, formatCountdown(state.countdownRemainingMs));
      this.#timeValue.classList.toggle("is-urgent", state.countdownRemainingMs <= 20000);
    } else {
      setText(this.#timeCaption, "Elapsed");
      setText(this.#timeValue, formatSeconds(state.elapsedMs));
      this.#timeValue.classList.remove("is-urgent");
    }

    const noun = unitNoun(level);
    setText(this.#progressValue, `${noun} ${state.completedUnitIds.length}/${state.unitCount}`);

    setText(this.#phaseValue, phaseLabel(state.phase));
    this.#phaseValue.className = `nag-hud-value nag-hud-phase nag-phase-${state.phase.toLowerCase()}`;

    this.#updateViewCost(state, level);

    this.#updateDeductionFlash(state, level);
  }

  #updateViewCost(state: GameState, level: LevelConfig): void {
    const rule = level.orderPopup;
    const showsCost = rule !== null && rule.kind === "metered";
    this.#viewCostGroup.hidden = !showsCost;
    this.#viewTimeGroup.hidden = !showsCost;
    if (!showsCost || state.popup === null) {
      setText(this.#viewCostValue, "0");
      setText(this.#viewTimeValue, "0:00");
      return;
    }
    setText(this.#viewCostValue, String(state.popup.chargedPoints));
    this.#viewCostValue.classList.toggle("is-negative", state.popup.chargedPoints > 0);
    setText(this.#viewTimeValue, formatSeconds(state.popup.viewedMs));
  }

  #updateDeductionFlash(state: GameState, level: LevelConfig): void {
    const rule = level.timeRule;
    const isActive = ACTIVE_PHASES.includes(state.phase);
    if (rule.kind !== "countdown" || state.countdownRemainingMs === null || !isActive) {
      this.#passedMarks = 0;
      return;
    }
    const passed = countPassedMarks(state.countdownRemainingMs, rule.penaltyMarksMs);
    const fresh = passed - this.#passedMarks;
    this.#passedMarks = passed;
    if (fresh <= 0) {
      return;
    }
    setText(this.#deductionBadge, `-${fresh * 2}`);
    this.#deductionBadge.classList.remove("is-flashing");
    void this.#deductionBadge.offsetWidth;
    this.#deductionBadge.classList.add("is-flashing");
  }

  resetDeductionFlash(): void {
    this.#passedMarks = 0;
    this.#deductionBadge.classList.remove("is-flashing");
    setText(this.#deductionBadge, "");
  }
}

function phaseLabel(phase: GamePhase): string {
  switch (phase) {
    case "Idle":
      return "Idle";
    case "Scout":
      return "Scout (no penalty)";
    case "Linger":
      return "Linger";
    case "Run":
      return "Run";
    case "Win":
      return "Won";
    case "Failed":
      return "Failed";
    default:
      return phase;
  }
}
