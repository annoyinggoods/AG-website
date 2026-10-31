import { pieceAt, BOARD_SIZE } from "../engine/board.js";
import { legalMoves, applyMove, cloneState, createGame, } from "../engine/game.js";
import { applyPunishment } from "../engine/punishment.js";
import { playSound } from "./sounds.js";
import { addToast } from "./toasts.js";
export class BoardUI {
    constructor(container, initialState, computer = null) {
        this.pulseTimer = null;
        this.pulseOn = false;
        this.container = container;
        this.computerColour = normalizeComputer(computer);
        this.stateData = freshUIState(initialState ?? createGame());
    }
    setStateChangeCallback(cb) {
        this.onStateChange = cb;
    }
    init() {
        this.clearPulse();
        this.render();
        this.updateBanner();
        this.updatePickerBanner();
        bindBoardEvents(this);
    }
    setComputerColour(colour) {
        this.computerColour = colour;
    }
    setLastMove(from, to) {
        this.stateData.lastFrom = { ...from };
        this.stateData.lastTo = { ...to };
        this.render();
    }
    clearLastMove() {
        this.stateData.lastFrom = null;
        this.stateData.lastTo = null;
    }
    applyEngineState(state, events = []) {
        const prev = this.stateData.state;
        this.stateData.state = cloneState(state);
        syncSelection(this, prev, this.stateData.state);
        this.render();
        this.updateBanner();
        this.updatePickerBanner();
        if (this.onStateChange) {
            this.onStateChange(this.stateData.state, events);
        }
    }
    render() {
        renderInto(this);
    }
    updateBanner() {
        const text = this.stateData.state.turn.toUpperCase() + " to move";
        const primary = document.getElementById("hud-turn-banner");
        if (primary) {
            primary.textContent = text;
        }
        const fallback = document.getElementById("turn-banner");
        if (fallback) {
            fallback.textContent = text;
        }
    }
    updatePickerBanner() {
        const banner = document.getElementById("picker-banner");
        if (!banner) {
            return;
        }
        if (this.stateData.pickerActive) {
            const offender = offenderOf(this.stateData.state);
            const chooser = this.stateData.state.turn.toUpperCase();
            const off = offender === null ? "OPPONENT" : offender.toUpperCase();
            banner.textContent = off + " missed a kill — " + chooser + " picks a victim";
            banner.classList.remove("hidden");
        }
        else {
            banner.classList.add("hidden");
        }
    }
    ensurePulse() {
        if (reducedMotion()) {
            return;
        }
        if (this.pulseTimer !== null) {
            return;
        }
        this.pulseTimer = window.setInterval(() => {
            this.pulseOn = !this.pulseOn;
            const el = this.container.querySelector(".square.selected");
            if (el) {
                el.classList.toggle("pulse", this.pulseOn);
            }
        }, 600);
    }
    clearPulse() {
        if (this.pulseTimer !== null) {
            clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }
        this.pulseOn = false;
        const el = this.container.querySelector(".square.selected.pulse");
        if (el) {
            el.classList.remove("pulse");
        }
    }
    selectPiece(square, piece) {
        this.clearSelectionFields();
        this.stateData.selectedSquare = { ...square };
        this.stateData.selectedPieceId = piece.id;
        const moves = legalMoves(this.stateData.state);
        if (this.stateData.state.pendingChain !== null) {
            this.stateData.legalDestinations = moves.map((m) => ({ ...m.to }));
        }
        else {
            this.stateData.legalDestinations = moves
                .filter((m) => m.from.row === square.row && m.from.column === square.column)
                .map((m) => ({ ...m.to }));
        }
        this.render();
        this.ensurePulse();
    }
    clearSelection() {
        this.clearSelectionFields();
        this.clearPulse();
        this.render();
    }
    clearSelectionFields() {
        this.stateData.selectedSquare = null;
        this.stateData.selectedPieceId = null;
        this.stateData.legalDestinations = [];
    }
    flashIllegal(square) {
        const el = this.getSquareElement(square);
        if (el) {
            el.classList.add("illegal-flash");
            window.setTimeout(() => {
                el.classList.remove("illegal-flash");
            }, 300);
        }
        playSound("illegal-move");
        const detail = { square: { ...square } };
        this.container.dispatchEvent(new CustomEvent("draghts:illegal-move", { detail, bubbles: true }));
        document.dispatchEvent(new CustomEvent("draghts:illegal-move", { detail }));
    }
    getSquareElement(square) {
        return this.container.querySelector('.square[data-row="' + square.row + '"][data-column="' + square.column + '"]');
    }
}
function normalizeComputer(computer) {
    if (computer === "white" || computer === "purple") {
        return computer;
    }
    if (computer === true) {
        return "purple";
    }
    return null;
}
function freshUIState(state) {
    return {
        state,
        selectedSquare: null,
        selectedPieceId: null,
        legalDestinations: [],
        lastFrom: null,
        lastTo: null,
        pickerActive: false,
    };
}
function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function offenderOf(state) {
    if (state.pendingPunishment === null) {
        return null;
    }
    return state.pendingPunishment.victimPlayer;
}
function syncSelection(board, prev, curr) {
    if (curr.pendingPunishment !== null && prev.pendingPunishment === null) {
        board.clearSelectionFields();
        board.clearPulse();
        board.stateData.pickerActive = true;
    }
    else if (curr.pendingPunishment === null && prev.pendingPunishment !== null) {
        board.stateData.pickerActive = false;
    }
    if (curr.status === "ended") {
        board.clearSelectionFields();
        board.clearPulse();
        board.stateData.pickerActive = false;
    }
}
function renderInto(board) {
    const ui = board.stateData;
    const grid = document.createElement("div");
    grid.id = "board-grid";
    grid.className = "board-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", "Checkers board");
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            grid.appendChild(makeSquare(board, ui, row, col));
        }
    }
    const existing = board.container.querySelector("#board-grid");
    if (existing) {
        board.container.replaceChild(grid, existing);
    }
    else {
        board.container.appendChild(grid);
    }
}
function makeSquare(board, ui, row, col) {
    const dark = (row + col) % 2 === 1;
    const div = document.createElement("div");
    div.className = dark ? "square dark playable" : "square light";
    div.dataset.row = String(row);
    div.dataset.column = String(col);
    div.setAttribute("role", "gridcell");
    div.setAttribute("aria-label", "square " + row + ", " + col);
    div.setAttribute("tabindex", dark ? "0" : "-1");
    const piece = pieceAt(ui.state.board, { row, column: col });
    if (piece !== null) {
        div.appendChild(makePieceEl(piece, ui, board.computerColour));
    }
    if (ui.selectedSquare !== null && ui.selectedSquare.row === row && ui.selectedSquare.column === col) {
        div.classList.add("selected");
    }
    if (ui.legalDestinations.some((s) => s.row === row && s.column === col)) {
        div.classList.add("legal-destination");
    }
    if (isLastMove(ui, row, col)) {
        div.style.outline = "2px solid #ffd700";
    }
    return div;
}
function isLastMove(ui, row, col) {
    const from = ui.lastFrom;
    const to = ui.lastTo;
    if (from === null || to === null) {
        return false;
    }
    return (from.row === row && from.column === col) || (to.row === row && to.column === col);
}
function makePieceEl(piece, ui, computerColour) {
    const el = document.createElement("div");
    el.className = "piece " + piece.player + (piece.kind === "king" ? " king-ring" : "");
    if (ui.state.empowerment.activeBuffs.some((b) => b.pieceId === piece.id)) {
        el.classList.add("queen-buff");
    }
    if (computerColour !== null && piece.player === computerColour) {
        const img = document.createElement("img");
        img.src = "/assets/draghts/draghts-logo.webp";
        img.alt = "drAGhts logo";
        img.className = "draghts-logo";
        el.appendChild(img);
    }
    else {
        el.textContent = piece.kind === "king" ? "K" : "";
    }
    if (ui.pickerActive) {
        const offender = offenderOf(ui.state);
        if (offender !== null && piece.player === offender) {
            el.style.outline = "2px solid #ffd700";
            el.style.cursor = "pointer";
        }
    }
    return el;
}
function bindBoardEvents(board) {
    board.container.addEventListener("click", (e) => {
        const target = e.target;
        if (!target) {
            return;
        }
        const squareEl = target.closest(".square");
        if (!squareEl) {
            return;
        }
        const square = squareFromElement(squareEl);
        if (square === null) {
            return;
        }
        onSquareClick(board, square);
    });
    board.container.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") {
            return;
        }
        const focusEl = document.activeElement;
        if (!focusEl || !focusEl.classList.contains("square")) {
            return;
        }
        const square = squareFromElement(focusEl);
        if (square === null) {
            return;
        }
        onSquareClick(board, square);
    });
}
function squareFromElement(el) {
    const row = parseInt(el.dataset.row ?? "", 10);
    const col = parseInt(el.dataset.column ?? "", 10);
    if (Number.isNaN(row) || Number.isNaN(col)) {
        return null;
    }
    return { row, column: col };
}
function onSquareClick(board, square) {
    const state = board.stateData.state;
    if (state.status === "ended") {
        return;
    }
    if (state.pendingPunishment !== null) {
        onPickerClick(board, square);
        return;
    }
    if (state.pendingChain !== null) {
        onChainClick(board, square);
        return;
    }
    const clicked = pieceAt(state.board, square);
    if (clicked !== null && clicked.player === state.turn) {
        toggleSelect(board, square, clicked);
        return;
    }
    if (board.stateData.selectedSquare === null || board.stateData.selectedPieceId === null) {
        return;
    }
    const legal = board.stateData.legalDestinations.some((s) => s.row === square.row && s.column === square.column);
    if (legal) {
        moveToDestination(board, square);
    }
    else {
        board.flashIllegal(square);
    }
}
function toggleSelect(board, square, piece) {
    const sel = board.stateData.selectedSquare;
    if (sel !== null && sel.row === square.row && sel.column === square.column) {
        board.clearSelection();
    }
    else {
        board.selectPiece(square, piece);
    }
}
function onPickerClick(board, square) {
    const piece = pieceAt(board.stateData.state.board, square);
    if (piece === null) {
        return;
    }
    const offender = offenderOf(board.stateData.state);
    if (offender === null || piece.player !== offender) {
        return;
    }
    try {
        const result = applyPunishment(board.stateData.state, piece.id);
        board.applyEngineState(result.state, result.events);
    }
    catch {
        addToast("That victim cannot be picked.");
    }
}
function onChainClick(board, square) {
    const chain = board.stateData.state.pendingChain;
    if (!chain) {
        return;
    }
    const moves = legalMoves(board.stateData.state);
    const match = moves.find((m) => m.from.row === chain.square.row &&
        m.from.column === chain.square.column &&
        m.to.row === square.row &&
        m.to.column === square.column);
    if (!match) {
        board.flashIllegal(square);
        return;
    }
    try {
        const result = applyMove(board.stateData.state, match);
        board.stateData.lastFrom = { ...match.from };
        board.stateData.lastTo = { ...match.to };
        board.applyEngineState(result.state, result.events);
    }
    catch {
        board.flashIllegal(square);
    }
}
function moveToDestination(board, to) {
    const selected = board.stateData.selectedSquare;
    if (selected === null) {
        return;
    }
    const moves = legalMoves(board.stateData.state);
    const match = moves.find((m) => m.from.row === selected.row &&
        m.from.column === selected.column &&
        m.to.row === to.row &&
        m.to.column === to.column);
    if (!match) {
        board.flashIllegal(to);
        return;
    }
    try {
        const result = applyMove(board.stateData.state, match);
        board.stateData.lastFrom = { ...match.from };
        board.stateData.lastTo = { ...match.to };
        board.clearSelectionFields();
        board.clearPulse();
        board.applyEngineState(result.state, result.events);
    }
    catch {
        board.flashIllegal(to);
    }
}
//# sourceMappingURL=board.js.map