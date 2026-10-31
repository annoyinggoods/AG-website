/**
 * The shell regions that sit under the app container. The order popup lives in
 * one of them, and the rest of the page is made inert while it is open, so a
 * screen reader and a keyboard player only meet the dialog.
 */
const POPUP_REGION_CLASS = "nag-order-popup-region";
/**
 * The elements that hold the game. Everything the visitor can reach that is
 * not part of the game and not the dialog itself is made inert while the
 * dialog is open.
 */
function findBackgroundRegions(app) {
    const regions = [];
    const seen = new Set();
    // The regions inside the game that the dialog does not sit in.
    for (const child of app.children) {
        if (child instanceof HTMLElement && !child.classList.contains(POPUP_REGION_CLASS)) {
            regions.push(child);
            seen.add(child);
        }
    }
    // The site chrome around the game. The walk climbs from the game to the
    // body and collects the siblings on the way, so the menu and the footer go
    // quiet as well while the dialog is open.
    let child = app;
    let parent = app.parentElement;
    while (parent !== null && parent !== document.body) {
        for (const sibling of parent.children) {
            if (sibling === child || !(sibling instanceof HTMLElement)) {
                continue;
            }
            if (!seen.has(sibling)) {
                regions.push(sibling);
                seen.add(sibling);
            }
        }
        child = parent;
        parent = parent.parentElement;
    }
    return regions;
}
/**
 * Wires up the modal behaviour of the order popup.
 *
 * The dialog declares aria-modal, so it has to behave like one: the focus
 * goes in when it opens, the focus cannot leave while it is open, and the
 * page behind it is inert to pointers and to assistive technology.
 */
export function createModalBackdrop(app, panel, closeButton) {
    let previousFocus = null;
    let open = false;
    const backgroundRegions = () => findBackgroundRegions(app);
    const setBackgroundInert = (inert) => {
        for (const region of backgroundRegions()) {
            region.inert = inert;
        }
    };
    /**
     * The element that had the focus when the dialog opened. It is found by
     * asking the page rather than by reading the active element at the moment
     * of opening, because a click moves the focus to the body before the
     * opening code runs.
     */
    const findFocusOrigin = () => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
            return active;
        }
        const revealed = app.querySelector("button.nag-reveal-order");
        if (revealed !== null && !revealed.disabled && revealed.offsetParent !== null) {
            return revealed;
        }
        return null;
    };
    /**
     * Where the focus goes back to when the dialog closes. The reveal button
     * is the usual answer, but it is disabled while the popup is up, so the
     * board is the fallback.
     */
    const findFocusTarget = () => {
        const revealed = app.querySelector("button.nag-reveal-order");
        if (revealed !== null && !revealed.disabled && revealed.offsetParent !== null) {
            return revealed;
        }
        const tabStop = app.querySelector(".nag-card[tabindex='0']");
        if (tabStop !== null) {
            return tabStop;
        }
        return app.querySelector(".nag-card");
    };
    /**
     * The dialog holds a single tab stop, the close button, so both directions
     * of the tab key stay on it. The inert background already stops the focus
     * leaving, and this makes the cycle explicit.
     */
    const keepFocusInside = (event) => {
        if (event.key !== "Tab") {
            return;
        }
        event.preventDefault();
        closeButton.focus({ preventScroll: true });
    };
    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            return;
        }
        keepFocusInside(event);
    };
    return {
        open: () => {
            if (open) {
                return;
            }
            open = true;
            // The place to go back to is found before the background is made inert,
            // because an inert element cannot hold the focus.
            previousFocus = findFocusOrigin();
            setBackgroundInert(true);
            panel.addEventListener("keydown", onKeyDown);
            // The focus is placed without scrolling, because the browser would drag
            // the whole page to the button and the game sits inside a long page
            // here. The panel is brought into view instead, which scrolls the
            // least and keeps the whole dialog on screen.
            //
            // The site scrolls smoothly, and a smooth scroll takes long enough for
            // the game clock to run on, so the scroll is made instant.
            closeButton.focus({ preventScroll: true });
            panel.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        },
        close: () => {
            if (!open) {
                return;
            }
            open = false;
            panel.removeEventListener("keydown", onKeyDown);
            // The page is given back before the focus is returned, because a focus
            // target that is still inside an inert region cannot take the focus.
            setBackgroundInert(false);
            const target = previousFocus ?? findFocusTarget();
            previousFocus = null;
            if (target !== null && target.isConnected) {
                target.focus({ preventScroll: true });
            }
        },
    };
}
//# sourceMappingURL=modal-backdrop.js.map