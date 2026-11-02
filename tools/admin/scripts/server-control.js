// The button that stops the helper.
// The work can be finished before the idle window ends, so the operator can
// close the helper from the panel itself instead of hunting for the window
// that started it.
import { helperIsRunning, shutdownHelper } from "./api.js";
import { required, setStatus } from "./dom.js";
export function startServerControl() {
    const button = required("[data-panel-disconnect]");
    button.addEventListener("click", function () {
        void stopServer(button);
    });
}
// The button only comes alive when there is a helper to stop.
export function allowDisconnect() {
    required("[data-panel-disconnect]").disabled = false;
}
async function stopServer(button) {
    button.disabled = true;
    try {
        await shutdownHelper();
        setStatus("The helper has stopped. This tab can be closed, and npm run admin starts it again.", "ok");
        return;
    }
    catch (err) {
        void err;
    }
    // The helper may already be gone, because it stopped itself after the idle
    // window. That is the result the operator asked for.
    if (!(await helperIsRunning())) {
        setStatus("The helper is not running any more. This tab can be closed.", "ok");
        return;
    }
    setStatus("The helper did not stop. Try the button again.", "error");
    button.disabled = false;
}
//# sourceMappingURL=server-control.js.map