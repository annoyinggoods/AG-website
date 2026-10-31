export type CardId = number;
export type UnitId = number;

export interface Card {
  readonly id: CardId;
  readonly face: string;
  readonly unitId: UnitId;
}

export interface Unit {
  readonly id: UnitId;
  readonly faces: readonly string[];
  readonly cardIds: readonly CardId[];
}

export interface Deal {
  readonly cards: readonly Card[];
  readonly units: readonly Unit[];
}

export interface UnitSpec {
  readonly faces: readonly string[];
}

export type ScoutEndRule = "pair" | "sequence";

export type TimeRule =
  | { readonly kind: "elapsed" }
  | {
      readonly kind: "countdown";
      readonly totalMs: number;
      readonly penaltyMarksMs: readonly number[];
    };

export type OrderPopupRule =
  | {
      readonly kind: "metered";
      readonly freeMs: number;
      readonly meterUnitMs: number;
      readonly graceMs: number;
    }
  | {
      readonly kind: "free";
      readonly stripRetireAfterPairs: number;
    };

export interface LevelConfig {
  readonly id: number;
  readonly cols: number;
  readonly rows: number;
  readonly units: readonly UnitSpec[];
  readonly scoutCap: number;
  readonly scoutEnd: ScoutEndRule;
  readonly timeRule: TimeRule;
  readonly orderPopup: OrderPopupRule | null;
}

export type GamePhase = "Idle" | "Scout" | "Linger" | "Run" | "Win" | "Failed";

export type FlipRejectionReason =
  | "not-started"
  | "game-over"
  | "popup-open"
  | "already-revealed"
  | "unknown-card";

export type FlipOutcome =
  | { kind: "rejected"; reason: FlipRejectionReason }
  | { kind: "scout-reveal"; cardId: CardId }
  | { kind: "scout-cap-reset"; cardId: CardId }
  | {
      kind: "scout-ended";
      cardId: CardId;
      anchorUnitId: UnitId;
      pointAwarded: boolean;
    }
  | { kind: "run-reveal"; cardId: CardId }
  | {
      kind: "unit-completed";
      cardId: CardId;
      unitId: UnitId;
      pointAwarded: boolean;
      won: boolean;
    }
  | { kind: "run-failed"; cardId: CardId; penalized: boolean };

export type EngineEvent =
  | { type: "started" }
  | { type: "flip"; outcome: FlipOutcome }
  | { type: "cards-hidden"; resumedPhase: GamePhase }
  | { type: "popup-opened"; free: boolean }
  | { type: "popup-closed"; chargedPoints: number }
  | { type: "won" }
  | { type: "failed" };

export type EngineListener = (event: EngineEvent) => void;

export interface PopupState {
  readonly open: boolean;
  readonly free: boolean;
  readonly freeRemainingMs: number;
  readonly chargedPoints: number;
  readonly pendingUnits: number;
  readonly viewedMs: number;
  readonly sessionMs: number;
  readonly sessionClockMs: number;
  readonly chargedMs: number;
}

export interface GameState {
  readonly levelId: number;
  readonly phase: GamePhase;
  readonly score: number;
  readonly revealedCardIds: readonly CardId[];
  readonly seenCardIds: readonly CardId[];
  readonly anchorUnitId: UnitId | null;
  readonly requiredOrder: readonly UnitId[];
  readonly targetUnitId: UnitId | null;
  readonly completedUnitIds: readonly UnitId[];
  readonly unitCount: number;
  readonly lingerHideAfterMs: number | null;
  readonly startedAtMs: number | null;
  readonly stoppedAtMs: number | null;
  readonly failedAtMs: number | null;
  readonly elapsedMs: number;
  readonly countdownRemainingMs: number | null;
  readonly popup: PopupState | null;
}
