import { requiredOrder } from "./order.js";
import { Score } from "./scoring.js";
import {
  commencedUnits,
  countPassedMarks,
  countdownRemainingMs,
  elapsedMs,
  freePopupRemainingMs,
} from "./timer-model.js";
import type {
  CardId,
  Deal,
  EngineEvent,
  EngineListener,
  FlipOutcome,
  FlipRejectionReason,
  GamePhase,
  GameState,
  LevelConfig,
  PopupState,
  UnitId,
} from "./types.js";

export const LINGER_MS = 4000;

const LAST_DEDUCIBLE_CARD_COUNT = 2;

type Linger = {
  hideAfterMs: number;
  resume: "scout" | "run";
};

export class GameEngine {
  readonly #level: LevelConfig;
  readonly #deal: Deal;
  readonly #clock: () => number;
  readonly #score = new Score();
  readonly #listeners = new Set<EngineListener>();

  #phase: GamePhase = "Idle";
  #revealed = new Set<CardId>();
  #seen = new Set<CardId>();
  #anchor: UnitId | null = null;
  #order: UnitId[] = [];
  #targetIndex = 0;
  #targetProgress: CardId[] = [];
  #scoutAnchorCandidate: UnitId | null = null;
  #linger: Linger | null = null;
  #startedAtMs: number | null = null;
  #stoppedAtMs: number | null = null;
  #failedAtMs: number | null = null;
  #popupOpen = false;
  #popupIsFree = false;
  #popupOpenedAtMs = 0;
  #freePopupSpent = false;
  #meteredViewMs = 0;
  #totalViewMs = 0;

  constructor(level: LevelConfig, deal: Deal, clock: () => number) {
    this.#level = level;
    this.#deal = deal;
    this.#clock = clock;
  }

  subscribe(listener: EngineListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  start(): void {
    this.#resolveTime();
    if (this.#phase !== "Idle") {
      return;
    }
    const now = this.#clock();
    this.#startedAtMs = now;
    this.#phase = "Scout";
    const rule = this.#level.orderPopup;
    if (rule !== null && rule.kind === "metered") {
      this.#popupOpen = true;
      this.#popupIsFree = true;
      this.#popupOpenedAtMs = now;
    }
    this.#emit({ type: "started" });
  }

  flip(cardId: CardId): FlipOutcome {
    this.#resolveTime();
    const rejection = this.#rejectionFor(cardId);
    if (rejection !== null) {
      return this.#finishFlip({ kind: "rejected", reason: rejection });
    }
    if (this.#phase === "Linger") {
      return this.#finishFlip(this.#flipDuringLinger(cardId));
    }
    if (this.#phase === "Scout") {
      return this.#finishFlip(this.#flipDuringScout(cardId));
    }
    return this.#finishFlip(this.#flipDuringRun(cardId));
  }

  tick(): void {
    this.#resolveTime();
  }

  openOrderPopup(): boolean {
    this.#resolveTime();
    if (this.#level.orderPopup === null) {
      return false;
    }
    if (this.#phase === "Idle" || this.#phase === "Win" || this.#phase === "Failed") {
      return false;
    }
    if (this.#popupOpen) {
      return false;
    }
    const rule = this.#level.orderPopup;
    if (rule === null) {
      return false;
    }
    if (rule.kind === "free") {
      this.#popupOpen = true;
      this.#popupIsFree = true;
      this.#popupOpenedAtMs = this.#clock();
      this.#emit({ type: "popup-opened", free: true });
      return true;
    }
    this.#popupOpen = true;
    this.#popupIsFree = !this.#freePopupSpent;
    this.#popupOpenedAtMs = this.#clock();
    this.#emit({ type: "popup-opened", free: this.#popupIsFree });
    return true;
  }

  closeOrderPopup(): number {
    this.#resolveTime();
    if (!this.#popupOpen) {
      return 0;
    }
    return this.#closePopup(this.#clock());
  }

  getState(): GameState {
    this.#resolveTime();
    const now = this.#clock();
    const startedAt = this.#startedAtMs;
    const timeRule = this.#level.timeRule;
    const elapsed = startedAt !== null ? elapsedMs(startedAt, now, this.#stoppedAtMs) : 0;
    const countdownRemaining =
      timeRule.kind === "countdown" && startedAt !== null
        ? countdownRemainingMs(startedAt, timeRule.totalMs, now)
        : null;
    return {
      levelId: this.#level.id,
      phase: this.#phase,
      score: this.#score.value,
      revealedCardIds: [...this.#revealed],
      seenCardIds: [...this.#seen],
      anchorUnitId: this.#anchor,
      requiredOrder: [...this.#order],
      targetUnitId: this.#order.length > 0 ? this.#order[this.#targetIndex]! : null,
      completedUnitIds: this.#score.completedUnitIds,
      unitCount: this.#deal.units.length,
      lingerHideAfterMs: this.#linger !== null ? this.#linger.hideAfterMs : null,
      startedAtMs: this.#startedAtMs,
      stoppedAtMs: this.#stoppedAtMs,
      failedAtMs: this.#failedAtMs,
      elapsedMs: elapsed,
      countdownRemainingMs: countdownRemaining,
      popup: this.#popupState(now),
    };
  }

  #emit(event: EngineEvent): void {
    this.#listeners.forEach((listener) => listener(event));
  }

  #finishFlip(outcome: FlipOutcome): FlipOutcome {
    this.#emit({ type: "flip", outcome });
    return outcome;
  }

  #rejectionFor(cardId: CardId): FlipRejectionReason | null {
    if (this.#phase === "Idle") {
      return "not-started";
    }
    if (this.#phase === "Win" || this.#phase === "Failed") {
      return "game-over";
    }
    if (this.#popupOpen) {
      return "popup-open";
    }
    if (cardId < 0 || cardId >= this.#deal.cards.length) {
      return "unknown-card";
    }
    if (this.#revealed.has(cardId) && !this.#isLingerTarget(cardId)) {
      return "already-revealed";
    }
    return null;
  }

  /**
   * During a linger the card the run is waiting for may still be face up from
   * the scout, so clicking it has to be allowed even though it is revealed.
   */
  #isLingerTarget(cardId: CardId): boolean {
    if (this.#phase !== "Linger") {
      return false;
    }
    const linger = this.#linger;
    if (linger === null || linger.resume !== "run") {
      return false;
    }
    const targetUnitId = this.#order[this.#targetIndex];
    if (targetUnitId === undefined) {
      return false;
    }
    return this.#deal.units[targetUnitId]!.cardIds.includes(cardId);
  }

  #flipDuringScout(cardId: CardId): FlipOutcome {
    const unitId = this.#deal.cards[cardId]!.unitId;
    this.#revealed.add(cardId);
    this.#seen.add(cardId);
    if (this.#scoutAnchorCandidate === null) {
      this.#scoutAnchorCandidate = unitId;
    }
    const endedUnit = this.#scoutEndUnitFor(unitId);
    if (endedUnit !== null) {
      return this.#endScout(endedUnit, cardId);
    }
    if (this.#revealed.size >= this.#level.scoutCap) {
      this.#beginLinger("scout");
      this.#scoutAnchorCandidate = null;
      return { kind: "scout-cap-reset", cardId };
    }
    return { kind: "scout-reveal", cardId };
  }

  #scoutEndUnitFor(unitId: UnitId): UnitId | null {
    if (this.#level.scoutEnd === "pair") {
      const candidate = this.#scoutAnchorCandidate;
      if (candidate === null) {
        return null;
      }
      const unit = this.#deal.units[unitId]!;
      const complete = unit.cardIds.every((id) => this.#revealed.has(id));
      return unitId === candidate && complete ? candidate : null;
    }
    const candidate = this.#scoutAnchorCandidate;
    if (candidate === null) {
      return null;
    }
    const successor = (candidate + 1) % this.#deal.units.length;
    return unitId === successor ? candidate : null;
  }

  #endScout(anchorUnitId: UnitId, cardId: CardId): FlipOutcome {
    this.#anchor = anchorUnitId;
    this.#order = requiredOrder(this.#deal.units.length, anchorUnitId);
    const pointAwarded = this.#score.awardUnit(anchorUnitId);
    this.#targetIndex = 0;
    this.#targetProgress = [];
    this.#scoutAnchorCandidate = null;
    this.#beginLinger("run");
    return { kind: "scout-ended", cardId, anchorUnitId, pointAwarded };
  }

  #flipDuringRun(cardId: CardId): FlipOutcome {
    const unitId = this.#deal.cards[cardId]!.unitId;
    const targetUnitId = this.#order[this.#targetIndex]!;
    if (unitId !== targetUnitId) {
      const penalized = this.#penalizesWrongFlip(cardId);
      this.#revealed.add(cardId);
      this.#seen.add(cardId);
      if (penalized) {
        this.#score.penalizeWrongFlip();
      }
      this.#targetIndex = 0;
      this.#targetProgress = [];
      this.#beginLinger("run");
      return { kind: "run-failed", cardId, penalized };
    }
    this.#revealed.add(cardId);
    this.#seen.add(cardId);
    this.#targetProgress.push(cardId);
    const unit = this.#deal.units[targetUnitId]!;
    if (this.#targetProgress.length < unit.cardIds.length) {
      return { kind: "run-reveal", cardId };
    }
    const pointAwarded = this.#score.awardUnit(targetUnitId);
    const won = this.#targetIndex === this.#order.length - 1;
    if (won) {
      this.#phase = "Win";
      this.#stoppedAtMs = this.#clock();
      this.#emit({ type: "won" });
    } else {
      this.#targetIndex += 1;
      this.#targetProgress = [];
    }
    return { kind: "unit-completed", cardId, unitId: targetUnitId, pointAwarded, won };
  }

  /**
   * A wrong flip is free the first time the player turns a card over, because
   * the scout phase already taught them what was on it. It is penalised once
   * the card is already known, and it is always penalised once so few cards
   * are left that the answer can be deduced by elimination.
   */
  #penalizesWrongFlip(cardId: CardId): boolean {
    if (!this.#seen.has(cardId)) {
      return this.#unseenCardCount() <= LAST_DEDUCIBLE_CARD_COUNT;
    }
    return true;
  }

  #unseenCardCount(): number {
    return this.#deal.cards.length - this.#seen.size;
  }

  #beginLinger(resume: "scout" | "run"): void {
    this.#linger = { hideAfterMs: this.#clock() + LINGER_MS, resume };
    this.#phase = "Linger";
  }

  #hideCardsNow(): void {
    const linger = this.#linger;
    if (linger === null) {
      return;
    }
    this.#linger = null;
    this.#revealed.clear();
    // A finished attempt stays finished, so the hide must not bring the
    // phase back to Scout or Run.
    if (this.#phase === "Win" || this.#phase === "Failed") {
      return;
    }
    this.#phase = linger.resume === "scout" ? "Scout" : "Run";
    this.#emit({ type: "cards-hidden", resumedPhase: this.#phase });
  }

  /**
   * A flip during the linger hides the board first and then resolves on the
   * hidden board, so the player never waits out a dead delay.
   */
  #flipDuringLinger(cardId: CardId): FlipOutcome {
    this.#hideCardsNow();
    if (this.#phase === "Scout") {
      return this.#flipDuringScout(cardId);
    }
    return this.#flipDuringRun(cardId);
  }

  #resolveTime(): void {
    const now = this.#clock();
    this.#resolveLinger(now);
    this.#resolveCountdown(now);
    this.#resolvePopup(now);
  }

  #resolveLinger(now: number): void {
    const linger = this.#linger;
    if (linger === null || now < linger.hideAfterMs) {
      return;
    }
    this.#hideCardsNow();
  }

  #resolveCountdown(now: number): void {
    const rule = this.#level.timeRule;
    if (rule.kind !== "countdown") {
      return;
    }
    const startedAt = this.#startedAtMs;
    if (startedAt === null) {
      return;
    }
    const active =
      this.#phase === "Scout" || this.#phase === "Linger" || this.#phase === "Run";
    if (!active) {
      return;
    }
    const remaining = countdownRemainingMs(startedAt, rule.totalMs, now);
    const passed = countPassedMarks(remaining, rule.penaltyMarksMs);
    if (passed > 0) {
      this.#score.applyCountdownMarks(passed);
    }
    if (remaining <= 0) {
      this.#phase = "Failed";
      this.#failedAtMs = now;
      // The attempt is over, so the pending linger must not survive it.
      // Otherwise the next tick would restore the Run phase and the expired
      // countdown would fail the attempt a second time.
      this.#linger = null;
      this.#emit({ type: "failed" });
    }
  }

  #resolvePopup(now: number): void {
    if (!this.#popupOpen || !this.#popupIsFree) {
      return;
    }
    const startedAt = this.#startedAtMs;
    const rule = this.#level.orderPopup;
    if (startedAt === null || rule === null || rule.kind !== "metered") {
      return;
    }
    if (now < startedAt + rule.freeMs) {
      return;
    }
    this.#closePopup(now);
  }

  #closePopup(now: number): number {
    let charged = 0;
    const rule = this.#level.orderPopup;
    const sessionMs = now - this.#popupOpenedAtMs;
    this.#totalViewMs += sessionMs;
    if (rule !== null && rule.kind === "free") {
      this.#popupIsFree = false;
    } else if (this.#popupIsFree) {
      this.#freePopupSpent = true;
    } else if (rule !== null && rule.kind === "metered") {
      const billableMs = Math.max(0, sessionMs - rule.graceMs);
      this.#meteredViewMs += billableMs;
      const totalUnits = commencedUnits(this.#meteredViewMs, rule.meterUnitMs);
      charged = this.#score.chargeMeteredUnits(totalUnits);
    }
    this.#popupOpen = false;
    this.#popupIsFree = false;
    this.#emit({ type: "popup-closed", chargedPoints: charged });
    return charged;
  }

  #popupState(now: number): PopupState | null {
    const rule = this.#level.orderPopup;
    if (rule === null) {
      return null;
    }
    if (rule.kind === "free") {
      return {
        open: this.#popupOpen,
        free: true,
        freeRemainingMs: 0,
        chargedPoints: 0,
        pendingUnits: 0,
        viewedMs: 0,
        sessionMs: 0,
        sessionClockMs: 0,
        chargedMs: 0,
      };
    }
    const startedAt = this.#startedAtMs;
    const freeRemaining =
      startedAt !== null
        ? freePopupRemainingMs(startedAt, rule.freeMs, now)
        : rule.freeMs;
    let pendingUnits = 0;
    let sessionMs = 0;
    let chargedMs = 0;
    let sessionClockMs = 0;
    if (this.#popupOpen) {
      sessionMs = now - this.#popupOpenedAtMs;
      if (this.#popupIsFree) {
        sessionClockMs = sessionMs;
      } else {
        sessionClockMs = sessionMs - rule.graceMs;
        const billableMs = Math.max(0, sessionMs - rule.graceMs);
        chargedMs = this.#meteredViewMs + billableMs;
        const totalUnits = commencedUnits(chargedMs, rule.meterUnitMs);
        pendingUnits = Math.max(0, totalUnits - this.#score.meteredUnitsCharged);
      }
    }
    return {
      open: this.#popupOpen,
      free: this.#popupIsFree,
      freeRemainingMs: freeRemaining,
      chargedPoints: this.#score.meteredUnitsCharged,
      pendingUnits,
      viewedMs: this.#totalViewMs + sessionMs,
      sessionMs,
      sessionClockMs,
      chargedMs,
    };
  }
}
