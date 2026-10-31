import type { Deal, GameState, UnitId } from "../engine/types.js";
import { createElement, setText } from "./dom.js";
import { unitFaceLabel } from "./format.js";

export class OrderStripUI {
  readonly #root: HTMLElement;
  readonly #title: HTMLElement;
  readonly #note: HTMLElement;
  readonly #list: HTMLOListElement;
  readonly #chips = new Map<UnitId, HTMLLIElement>();

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#root.classList.add("nag-order-panel");

    this.#title = createElement("h2", "nag-order-title", "Play in this order");
    this.#note = createElement("p", "nag-order-note");
    this.#list = createElement("ol", "nag-order-list");
    this.#list.setAttribute("aria-label", "Order to play");

    this.#root.append(this.#title, this.#note, this.#list);
  }

  render(state: GameState, deal: Deal): void {
    this.#root.hidden = false;

    const order = this.#orderFor(state, deal);
    this.#renderChips(state, order, deal);
    this.#renderNote(state, deal);
    this.#root.dataset.state = state.anchorUnitId === null ? "scouting" : "running";
  }

  hide(): void {
    this.#root.hidden = true;
    this.#root.dataset.state = "hidden";
  }

  #orderFor(state: GameState, deal: Deal): UnitId[] {
    if (state.requiredOrder.length > 0) {
      return [...state.requiredOrder];
    }
    return deal.units.map((unit) => unit.id);
  }

  #renderChips(state: GameState, order: UnitId[], deal: Deal): void {
    const targetIndex = state.targetUnitId === null ? -1 : order.indexOf(state.targetUnitId);
    this.#syncChips(order);
    order.forEach((unitId, index) => {
      const chip = this.#chips.get(unitId);
      if (chip === undefined) {
        return;
      }
      setText(chip, unitFaceLabel(deal, unitId));
      chip.classList.toggle("is-done", targetIndex >= 0 && index < targetIndex);
      chip.classList.toggle("is-target", index === targetIndex);
    });
  }

  /**
   * The strip is rendered on every 100 ms tick, so the chip elements are kept
   * and only the ones the order no longer needs are removed. The elements are
   * only moved when the order itself changes, which happens once when the
   * anchor locks and the order rotates.
   */
  #syncChips(order: UnitId[]): void {
    const wanted = new Set(order);
    for (const unitId of [...this.#chips.keys()]) {
      if (wanted.has(unitId)) {
        continue;
      }
      this.#chips.get(unitId)?.remove();
      this.#chips.delete(unitId);
    }
    const desired: HTMLLIElement[] = [];
    for (const unitId of order) {
      let chip = this.#chips.get(unitId);
      if (chip === undefined) {
        chip = createElement("li", "nag-order-chip");
        chip.dataset.unitId = String(unitId);
        this.#chips.set(unitId, chip);
      }
      desired.push(chip);
    }
    const current = [...this.#list.children];
    const unchanged =
      current.length === desired.length &&
      current.every((node, index) => node === desired[index]);
    if (unchanged) {
      return;
    }
    this.#list.replaceChildren(...desired);
  }

  #renderNote(state: GameState, deal: Deal): void {
    if (state.anchorUnitId === null) {
      setText(this.#note, "Your anchor decides where this starts. Play from there and wrap around to the end.");
      return;
    }
    const anchorLabel = unitFaceLabel(deal, state.anchorUnitId);
    if (state.targetUnitId === null) {
      setText(this.#note, `Start at your anchor: ${anchorLabel}.`);
      return;
    }
    const targetLabel = unitFaceLabel(deal, state.targetUnitId);
    setText(this.#note, `Start at your anchor: ${anchorLabel}. Next up: ${targetLabel}.`);
  }
}
