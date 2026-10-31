import type { Deal, GameState, PopupState, UnitId } from "../engine/types.js";
import { createElement, setText } from "./dom.js";
import { formatCountdown, formatSeconds, formatSignedSeconds, unitFaceLabel } from "./format.js";
import { findAppRoot } from "../mount.js";
import { createModalBackdrop, type ModalBackdrop } from "./modal-backdrop.js";

export interface OrderPopupCallbacks {
  readonly onClose: () => void;
}

export class OrderPopupUI {
  readonly #root: HTMLElement;
  readonly #panel: HTMLElement;
  readonly #meter: HTMLElement;
  readonly #session: HTMLElement;
  readonly #sessionTime: HTMLElement;
  readonly #sessionCost: HTMLElement;
  readonly #total: HTMLElement;
  readonly #totalTime: HTMLElement;
  readonly #totalCost: HTMLElement;
  readonly #list: HTMLOListElement;
  readonly #closeButton: HTMLButtonElement;
  readonly #callbacks: OrderPopupCallbacks;
  readonly #backdrop: ModalBackdrop | null;
  #wasOpen = false;

  constructor(root: HTMLElement, callbacks: OrderPopupCallbacks) {
    this.#root = root;
    this.#callbacks = callbacks;

    this.#panel = createElement("div", "nag-order-popup");
    this.#panel.hidden = true;
    this.#panel.setAttribute("role", "dialog");
    this.#panel.setAttribute("aria-modal", "true");
    this.#panel.setAttribute("aria-label", "The order to play");

    const title = createElement("h2", "nag-order-popup-title", "The order to play");
    this.#meter = createElement("p", "nag-order-popup-meter");

    this.#sessionTime = createElement("span", "nag-order-popup-timer", "0:00.0");
    this.#sessionCost = createElement("span", "nag-order-popup-cost", "0 points");
    this.#session = createElement("p", "nag-order-popup-session");
    this.#session.append(
      createElement("span", "nag-order-popup-label", "This look"),
      this.#sessionTime,
      this.#sessionCost,
    );

    this.#totalTime = createElement("span", "nag-order-popup-timer", "0:00");
    this.#totalCost = createElement("span", "nag-order-popup-cost", "0 points");
    this.#total = createElement("p", "nag-order-popup-total");
    this.#total.append(
      createElement("span", "nag-order-popup-label", "Total"),
      this.#totalTime,
      this.#totalCost,
    );

    this.#list = createElement("ol", "nag-order-popup-list");
    this.#list.setAttribute("aria-label", "Order to play");

    this.#closeButton = createElement(
      "button",
      "nag-button nag-button-primary nag-order-popup-close",
      "Back to the board",
    );
    this.#closeButton.type = "button";
    this.#closeButton.addEventListener("click", () => this.#callbacks.onClose());

    this.#panel.append(
      title,
      this.#meter,
      this.#session,
      this.#total,
      this.#list,
      this.#closeButton,
    );
    this.#root.append(this.#panel);

    const app = findAppRoot();
    this.#backdrop =
      app === null ? null : createModalBackdrop(app, this.#panel, this.#closeButton);
  }

  render(state: GameState, deal: Deal): void {
    const popup = state.popup;
    const open = popup !== null && popup.open;
    this.#panel.hidden = !open;
    if (!open) {
      this.#list.replaceChildren();
      this.#syncBackdrop(false);
      return;
    }
    this.#syncBackdrop(true);
    this.#renderMeter(state);
    this.#renderTimers(popup);
    this.#renderList(state, deal);
  }

  /**
   * The popup is rendered on every tick, so the change of state is what
   * opens and closes the modal behaviour rather than the render itself.
   */
  #syncBackdrop(open: boolean): void {
    if (open === this.#wasOpen) {
      return;
    }
    this.#wasOpen = open;
    if (open) {
      this.#backdrop?.open();
      return;
    }
    this.#backdrop?.close();
  }

  /**
   * Gives the page back when the popup goes away for a reason other than the
   * engine closing it, such as a level change or a restart.
   */
  dismiss(): void {
    this.#wasOpen = false;
    this.#backdrop?.close();
  }

  #renderMeter(state: GameState): void {
    const popup = state.popup;
    if (popup === null) {
      return;
    }
    if (popup.free) {
      setText(
        this.#meter,
        `Free to look for ${formatCountdown(popup.freeRemainingMs)}. Reading it again costs points.`,
      );
      return;
    }
    const units = popup.pendingUnits;
    setText(
      this.#meter,
      `Metered. The first second of every look is free. ${units} point${units === 1 ? "" : "s"} so far for this look.`,
    );
  }

  #renderTimers(popup: PopupState): void {
    setText(this.#sessionTime, formatSignedSeconds(popup.sessionClockMs));
    setText(this.#sessionCost, `${popup.pendingUnits} point${popup.pendingUnits === 1 ? "" : "s"}`);
    this.#sessionCost.classList.toggle("is-negative", popup.pendingUnits > 0);

    setText(this.#totalTime, formatSeconds(popup.viewedMs));
    setText(this.#totalCost, `${popup.chargedPoints} point${popup.chargedPoints === 1 ? "" : "s"}`);
    this.#totalCost.classList.toggle("is-negative", popup.chargedPoints > 0);
  }

  #renderList(state: GameState, deal: Deal): void {
    const order: UnitId[] =
      state.requiredOrder.length > 0
        ? [...state.requiredOrder]
        : deal.units.map((unit) => unit.id);
    const targetIndex = state.targetUnitId === null ? -1 : order.indexOf(state.targetUnitId);
    const items = order.map((unitId, index) => {
      const item = createElement("li", "nag-order-popup-item", unitFaceLabel(deal, unitId));
      item.dataset.unitId = String(unitId);
      if (targetIndex >= 0 && index < targetIndex) {
        item.classList.add("is-done");
      }
      if (index === targetIndex) {
        item.classList.add("is-target");
      }
      return item;
    });
    this.#list.replaceChildren(...items);
  }
}
