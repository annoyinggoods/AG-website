import { GAME_NAME, GAME_VERSION } from "./version.js";
import { App } from "./ui/app.js";
import { buildShell } from "./ui/shell.js";
/**
 * The container the game mounts into. The site page carries its own heading
 * for the game, so the game fills the container without a title of its own.
 */
const MOUNT_SELECTOR = "#nag-app";
const app = document.querySelector(MOUNT_SELECTOR);
if (app instanceof HTMLElement) {
    app.setAttribute("data-game", GAME_NAME);
    app.setAttribute("data-version", GAME_VERSION);
    // A page that is only the game asks for the title, because there is no
    // heading anywhere else on it. The site page brings its own.
    const showTitle = app.getAttribute("data-show-title") === "true";
    const shell = buildShell(app, { showTitle: showTitle });
    new App(shell);
}
//# sourceMappingURL=main.js.map