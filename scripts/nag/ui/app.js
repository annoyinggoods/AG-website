var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _App_instances, _App_instructions, _App_hud, _App_status, _App_order, _App_orderPopup, _App_board, _App_screens, _App_history, _App_historyStore, _App_stats, _App_statsStore, _App_playButton, _App_restartButton, _App_revealButton, _App_boardRoot, _App_levelId, _App_level, _App_deal, _App_engine, _App_unsubscribe, _App_timerHandle, _App_lingerHandle, _App_bindEngine, _App_enterIdleState, _App_startGame, _App_restart, _App_newAttempt, _App_selectLevel, _App_goToNextLevel, _App_openOrderPopup, _App_closeOrderPopup, _App_startTimer, _App_stopTimer, _App_scheduleLingerHide, _App_handleEngineEvent, _App_handleFlipOutcome, _App_handleWin, _App_handleFail, _App_recordStats, _App_renderStats, _App_recordHistory, _App_renderHistory, _App_clearHistory, _App_nextLevelId, _App_renderHud, _App_renderOrder, _App_showsOrderStrip, _App_renderRevealButton;
import { createLevel } from "../engine/levels.js";
import { GameEngine } from "../engine/run-state.js";
import { buildDeal, createCryptoRandom } from "../engine/shuffle.js";
import { scrollGameIntoView } from "../mount.js";
import { BoardUI } from "./board.js";
import { fireConfetti } from "./confetti.js";
import { createElement } from "./dom.js";
import { HistoryUI } from "./history.js";
import { createHistoryStore, createLocalHistoryStorage } from "./history-store.js";
import { HudUI } from "./hud.js";
import { InstructionsUI, unitNoun } from "./instructions.js";
import { OrderPopupUI } from "./order-popup.js";
import { OrderStripUI } from "./order-strip.js";
import { ScreensUI } from "./screens.js";
import { StatsDisplayUI } from "./stats-display.js";
import { createLocalStatsStorage, createStatsStore } from "./stats-store.js";
import { StatusUI, statusForOutcome } from "./status.js";
const TICK_INTERVAL_MS = 100;
const LEVEL_OPTIONS = [
    { id: 1, label: "Level 1 - 4x4" },
    { id: 2, label: "Level 2 - 6x6" },
    { id: 3, label: "Level 3 - 4x4 countdown" },
    { id: 4, label: "Level 4 - 5x5 fixed order" },
    { id: 5, label: "Level 5 - 6x6 letter pairs" },
    { id: 6, label: "Level 6 - 5x5 memorized order" },
];
export class App {
    constructor(shell) {
        _App_instances.add(this);
        _App_instructions.set(this, void 0);
        _App_hud.set(this, void 0);
        _App_status.set(this, void 0);
        _App_order.set(this, void 0);
        _App_orderPopup.set(this, void 0);
        _App_board.set(this, void 0);
        _App_screens.set(this, void 0);
        _App_history.set(this, void 0);
        _App_historyStore.set(this, void 0);
        _App_stats.set(this, void 0);
        _App_statsStore.set(this, void 0);
        _App_playButton.set(this, void 0);
        _App_restartButton.set(this, void 0);
        _App_revealButton.set(this, void 0);
        _App_boardRoot.set(this, void 0);
        _App_levelId.set(this, void 0);
        _App_level.set(this, void 0);
        _App_deal.set(this, void 0);
        _App_engine.set(this, void 0);
        _App_unsubscribe.set(this, null);
        _App_timerHandle.set(this, null);
        _App_lingerHandle.set(this, null);
        __classPrivateFieldSet(this, _App_levelId, LEVEL_OPTIONS[0].id, "f");
        __classPrivateFieldSet(this, _App_level, createLevel(__classPrivateFieldGet(this, _App_levelId, "f"), createCryptoRandom()), "f");
        __classPrivateFieldSet(this, _App_deal, buildDeal(__classPrivateFieldGet(this, _App_level, "f"), createCryptoRandom()), "f");
        __classPrivateFieldSet(this, _App_engine, new GameEngine(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), () => Date.now()), "f");
        __classPrivateFieldSet(this, _App_historyStore, createHistoryStore(createLocalHistoryStorage()), "f");
        __classPrivateFieldSet(this, _App_statsStore, createStatsStore(createLocalStatsStorage()), "f");
        __classPrivateFieldSet(this, _App_instructions, new InstructionsUI(shell.instructions), "f");
        __classPrivateFieldSet(this, _App_status, new StatusUI(shell.status), "f");
        __classPrivateFieldSet(this, _App_order, new OrderStripUI(shell.order), "f");
        __classPrivateFieldSet(this, _App_orderPopup, new OrderPopupUI(shell.orderPopup, {
            onClose: () => __classPrivateFieldGet(this, _App_instances, "m", _App_closeOrderPopup).call(this),
        }), "f");
        __classPrivateFieldSet(this, _App_board, new BoardUI(shell.board), "f");
        __classPrivateFieldSet(this, _App_boardRoot, shell.board, "f");
        __classPrivateFieldSet(this, _App_hud, new HudUI(shell.hud, LEVEL_OPTIONS, {
            onSelectLevel: (levelId) => __classPrivateFieldGet(this, _App_instances, "m", _App_selectLevel).call(this, levelId),
        }), "f");
        __classPrivateFieldSet(this, _App_screens, new ScreensUI(shell.screen, {
            onPlayAgain: () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this),
            onNextLevel: () => __classPrivateFieldGet(this, _App_instances, "m", _App_goToNextLevel).call(this),
            onRetry: () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this),
        }), "f");
        __classPrivateFieldSet(this, _App_history, new HistoryUI(shell.history, () => __classPrivateFieldGet(this, _App_instances, "m", _App_clearHistory).call(this)), "f");
        __classPrivateFieldSet(this, _App_stats, new StatsDisplayUI(shell.stats), "f");
        __classPrivateFieldSet(this, _App_playButton, createElement("button", "nag-button nag-button-primary nag-play", "PLAY"), "f");
        __classPrivateFieldGet(this, _App_playButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_playButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_startGame).call(this));
        __classPrivateFieldSet(this, _App_restartButton, createElement("button", "nag-button nag-button-secondary nag-restart", "RESTART"), "f");
        __classPrivateFieldGet(this, _App_restartButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_restartButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_restart).call(this));
        __classPrivateFieldSet(this, _App_revealButton, createElement("button", "nag-button nag-button-secondary nag-reveal-order", "REVEAL THE ORDER"), "f");
        __classPrivateFieldGet(this, _App_revealButton, "f").type = "button";
        __classPrivateFieldGet(this, _App_revealButton, "f").addEventListener("click", () => __classPrivateFieldGet(this, _App_instances, "m", _App_openOrderPopup).call(this));
        __classPrivateFieldGet(this, _App_revealButton, "f").hidden = true;
        shell.reveal.replaceChildren(__classPrivateFieldGet(this, _App_revealButton, "f"));
        shell.controls.replaceChildren(__classPrivateFieldGet(this, _App_playButton, "f"), __classPrivateFieldGet(this, _App_restartButton, "f"));
        __classPrivateFieldGet(this, _App_instances, "m", _App_bindEngine).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    }
}
_App_instructions = new WeakMap(), _App_hud = new WeakMap(), _App_status = new WeakMap(), _App_order = new WeakMap(), _App_orderPopup = new WeakMap(), _App_board = new WeakMap(), _App_screens = new WeakMap(), _App_history = new WeakMap(), _App_historyStore = new WeakMap(), _App_stats = new WeakMap(), _App_statsStore = new WeakMap(), _App_playButton = new WeakMap(), _App_restartButton = new WeakMap(), _App_revealButton = new WeakMap(), _App_boardRoot = new WeakMap(), _App_levelId = new WeakMap(), _App_level = new WeakMap(), _App_deal = new WeakMap(), _App_engine = new WeakMap(), _App_unsubscribe = new WeakMap(), _App_timerHandle = new WeakMap(), _App_lingerHandle = new WeakMap(), _App_instances = new WeakSet(), _App_bindEngine = function _App_bindEngine() {
    __classPrivateFieldGet(this, _App_unsubscribe, "f")?.call(this);
    __classPrivateFieldSet(this, _App_unsubscribe, __classPrivateFieldGet(this, _App_engine, "f").subscribe((event) => __classPrivateFieldGet(this, _App_instances, "m", _App_handleEngineEvent).call(this, event)), "f");
}, _App_enterIdleState = function _App_enterIdleState() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    // A new attempt drops the popup, so the page has to be given back before
    // the new board is built.
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_instructions, "f").render(__classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = false;
    __classPrivateFieldGet(this, _App_playButton, "f").disabled = false;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = true;
}, _App_startGame = function _App_startGame() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = true;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = true;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = false;
    // The board has to be on screen before the clock starts, so the player
    // does not lose the first seconds of the run to a scroll.
    scrollGameIntoView(__classPrivateFieldGet(this, _App_boardRoot, "f"));
    __classPrivateFieldGet(this, _App_engine, "f").start();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_startTimer).call(this);
}, _App_restart = function _App_restart() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_screens, "f").hide();
    __classPrivateFieldGet(this, _App_orderPopup, "f").dismiss();
    __classPrivateFieldGet(this, _App_instances, "m", _App_newAttempt).call(this);
    __classPrivateFieldGet(this, _App_hud, "f").resetDeductionFlash();
    __classPrivateFieldGet(this, _App_status, "f").clear();
    __classPrivateFieldGet(this, _App_playButton, "f").hidden = false;
    __classPrivateFieldGet(this, _App_playButton, "f").disabled = false;
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_restartButton, "f").hidden = true;
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_newAttempt = function _App_newAttempt() {
    __classPrivateFieldGet(this, _App_board, "f").unmount();
    __classPrivateFieldSet(this, _App_level, createLevel(__classPrivateFieldGet(this, _App_levelId, "f"), createCryptoRandom()), "f");
    __classPrivateFieldSet(this, _App_deal, buildDeal(__classPrivateFieldGet(this, _App_level, "f"), createCryptoRandom()), "f");
    __classPrivateFieldSet(this, _App_engine, new GameEngine(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), () => Date.now()), "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_bindEngine).call(this);
    __classPrivateFieldGet(this, _App_board, "f").mount(__classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_deal, "f"), __classPrivateFieldGet(this, _App_engine, "f"));
}, _App_selectLevel = function _App_selectLevel(levelId) {
    __classPrivateFieldSet(this, _App_levelId, levelId, "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
}, _App_goToNextLevel = function _App_goToNextLevel() {
    const nextId = __classPrivateFieldGet(this, _App_instances, "m", _App_nextLevelId).call(this);
    if (nextId === null) {
        __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
        return;
    }
    __classPrivateFieldSet(this, _App_levelId, nextId, "f");
    __classPrivateFieldGet(this, _App_instances, "m", _App_enterIdleState).call(this);
    __classPrivateFieldGet(this, _App_playButton, "f").focus();
}, _App_openOrderPopup = function _App_openOrderPopup() {
    if (!__classPrivateFieldGet(this, _App_engine, "f").openOrderPopup()) {
        return;
    }
    __classPrivateFieldGet(this, _App_status, "f").show({
        text: "The order is open. The clock keeps running.",
        tone: "warning",
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_closeOrderPopup = function _App_closeOrderPopup() {
    const charged = __classPrivateFieldGet(this, _App_engine, "f").closeOrderPopup();
    if (charged > 0) {
        __classPrivateFieldGet(this, _App_status, "f").show({
            text: `Closed. Looking at the order cost ${charged} point${charged === 1 ? "" : "s"}.`,
            tone: "warning",
        });
    }
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
}, _App_startTimer = function _App_startTimer() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldSet(this, _App_timerHandle, window.setInterval(() => {
        __classPrivateFieldGet(this, _App_engine, "f").tick();
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    }, TICK_INTERVAL_MS), "f");
}, _App_stopTimer = function _App_stopTimer() {
    if (__classPrivateFieldGet(this, _App_timerHandle, "f") !== null) {
        window.clearInterval(__classPrivateFieldGet(this, _App_timerHandle, "f"));
        __classPrivateFieldSet(this, _App_timerHandle, null, "f");
    }
    if (__classPrivateFieldGet(this, _App_lingerHandle, "f") !== null) {
        window.clearTimeout(__classPrivateFieldGet(this, _App_lingerHandle, "f"));
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
    }
}, _App_scheduleLingerHide = function _App_scheduleLingerHide() {
    if (__classPrivateFieldGet(this, _App_lingerHandle, "f") !== null) {
        window.clearTimeout(__classPrivateFieldGet(this, _App_lingerHandle, "f"));
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
    }
    const hideAfterMs = __classPrivateFieldGet(this, _App_engine, "f").getState().lingerHideAfterMs;
    if (hideAfterMs === null) {
        return;
    }
    const delay = Math.max(0, hideAfterMs - Date.now());
    __classPrivateFieldSet(this, _App_lingerHandle, window.setTimeout(() => {
        __classPrivateFieldSet(this, _App_lingerHandle, null, "f");
        __classPrivateFieldGet(this, _App_engine, "f").tick();
        __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    }, delay), "f");
}, _App_handleEngineEvent = function _App_handleEngineEvent(event) {
    if (event.type === "flip") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleFlipOutcome).call(this, event.outcome);
    }
    if (event.type === "won") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleWin).call(this);
    }
    if (event.type === "failed") {
        __classPrivateFieldGet(this, _App_instances, "m", _App_handleFail).call(this);
    }
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHud).call(this);
    __classPrivateFieldGet(this, _App_instances, "m", _App_scheduleLingerHide).call(this);
}, _App_handleFlipOutcome = function _App_handleFlipOutcome(outcome) {
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    if (state.phase === "Win" || state.phase === "Failed") {
        return;
    }
    const message = statusForOutcome(outcome, __classPrivateFieldGet(this, _App_deal, "f"), unitNoun(__classPrivateFieldGet(this, _App_level, "f")));
    if (message !== null) {
        __classPrivateFieldGet(this, _App_status, "f").show(message);
    }
}, _App_handleWin = function _App_handleWin() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_board, "f").revealAll();
    __classPrivateFieldGet(this, _App_status, "f").show({ text: "Perfect run. You won the level.", tone: "good" });
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_screens, "f").showWin(state, __classPrivateFieldGet(this, _App_level, "f"), __classPrivateFieldGet(this, _App_instances, "m", _App_nextLevelId).call(this) !== null);
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordHistory).call(this, state, true);
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordStats).call(this, state, true);
}, _App_handleFail = function _App_handleFail() {
    __classPrivateFieldGet(this, _App_instances, "m", _App_stopTimer).call(this);
    __classPrivateFieldGet(this, _App_board, "f").revealAll();
    __classPrivateFieldGet(this, _App_status, "f").show({ text: "Out of time. The attempt failed.", tone: "warning" });
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_screens, "f").showFail(state, __classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_hud, "f").levelSelect.disabled = false;
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordHistory).call(this, state, false);
    __classPrivateFieldGet(this, _App_instances, "m", _App_recordStats).call(this, state, false);
}, _App_recordStats = function _App_recordStats(state, won) {
    const result = __classPrivateFieldGet(this, _App_statsStore, "f").record(__classPrivateFieldGet(this, _App_level, "f").id, {
        score: state.score,
        timeMs: state.elapsedMs,
        won,
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderStats).call(this);
    if (!won) {
        return;
    }
    if (result.isNewBestScore || result.isNewBestTime) {
        fireConfetti().catch(() => undefined);
    }
}, _App_renderStats = function _App_renderStats() {
    __classPrivateFieldGet(this, _App_stats, "f").render(__classPrivateFieldGet(this, _App_statsStore, "f").statsFor(__classPrivateFieldGet(this, _App_level, "f").id));
}, _App_recordHistory = function _App_recordHistory(state, won) {
    __classPrivateFieldGet(this, _App_historyStore, "f").record({
        levelId: __classPrivateFieldGet(this, _App_level, "f").id,
        timeMs: state.elapsedMs,
        score: state.score,
        playedAtMs: Date.now(),
        progress: state.completedUnitIds.length,
        unitCount: state.unitCount,
        won,
    });
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
}, _App_renderHistory = function _App_renderHistory() {
    __classPrivateFieldGet(this, _App_history, "f").render(__classPrivateFieldGet(this, _App_historyStore, "f").list());
}, _App_clearHistory = function _App_clearHistory() {
    __classPrivateFieldGet(this, _App_historyStore, "f").clear();
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderHistory).call(this);
}, _App_nextLevelId = function _App_nextLevelId() {
    const currentIndex = LEVEL_OPTIONS.findIndex((option) => option.id === __classPrivateFieldGet(this, _App_levelId, "f"));
    const next = LEVEL_OPTIONS[currentIndex + 1];
    return next === undefined ? null : next.id;
}, _App_renderHud = function _App_renderHud() {
    const state = __classPrivateFieldGet(this, _App_engine, "f").getState();
    __classPrivateFieldGet(this, _App_hud, "f").render(state, __classPrivateFieldGet(this, _App_level, "f"));
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderOrder).call(this, state);
    // The reveal button is rendered before the popup, because the popup hands
    // the focus back to that button when it closes, and a disabled button
    // cannot take the focus.
    __classPrivateFieldGet(this, _App_instances, "m", _App_renderRevealButton).call(this, state);
    __classPrivateFieldGet(this, _App_orderPopup, "f").render(state, __classPrivateFieldGet(this, _App_deal, "f"));
}, _App_renderOrder = function _App_renderOrder(state) {
    if (!__classPrivateFieldGet(this, _App_instances, "m", _App_showsOrderStrip).call(this, state)) {
        __classPrivateFieldGet(this, _App_order, "f").hide();
        return;
    }
    __classPrivateFieldGet(this, _App_order, "f").render(state, __classPrivateFieldGet(this, _App_deal, "f"));
}, _App_showsOrderStrip = function _App_showsOrderStrip(state) {
    const rule = __classPrivateFieldGet(this, _App_level, "f").orderPopup;
    if (rule === null) {
        return true;
    }
    if (rule.kind === "metered") {
        return false;
    }
    return state.completedUnitIds.length < rule.stripRetireAfterPairs;
}, _App_renderRevealButton = function _App_renderRevealButton(state) {
    const rule = __classPrivateFieldGet(this, _App_level, "f").orderPopup;
    const popupOpen = state.popup?.open === true;
    const gameOver = state.phase === "Win" || state.phase === "Failed";
    const notStarted = state.phase === "Idle";
    const available = rule !== null && !popupOpen && !gameOver && !notStarted;
    __classPrivateFieldGet(this, _App_revealButton, "f").hidden = rule === null;
    __classPrivateFieldGet(this, _App_revealButton, "f").disabled = !available;
};
//# sourceMappingURL=app.js.map