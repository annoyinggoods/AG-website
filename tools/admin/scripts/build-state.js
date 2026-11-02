// The state of the site build, and the banner that tells the operator when
// the panel must not write. The helper rebuilds the site after every change,
// so the panel waits for that rebuild and then says what it did.
import { fetchHealth } from "./api.js";
import { required } from "./dom.js";
const POLL_STEPS = 40;
const POLL_PAUSE_MS = 300;
function pause(milliseconds) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, milliseconds);
    });
}
// The banner and the buttons that must not be used while the build is older
// than the sources. The buttons start out off in the markup, so nothing can
// be written in the moment between the boot and this answer.
export function showBuildState(health) {
    const banner = required("[data-panel-stale]");
    const save = required("[data-inspector-save]");
    const create = required("[data-editor-create]");
    if (!health || !health.stale) {
        banner.hidden = true;
        banner.textContent = "";
        save.disabled = false;
        create.disabled = false;
        return;
    }
    banner.textContent = health.staleReason;
    banner.hidden = false;
    save.disabled = true;
    create.disabled = true;
}
// The build state as the helper reports it.
export async function readBuildState() {
    try {
        return await fetchHealth();
    }
    catch (err) {
        void err;
        return null;
    }
}
// Waits for the rebuild the helper started to land and then reports it.
// The helper writes the log of a build when the build is done, so a log with
// the same start time means the build has finished.
export async function waitForBuild(startedAt) {
    for (let step = 0; step < POLL_STEPS; step += 1) {
        await pause(POLL_PAUSE_MS);
        const health = await readBuildState();
        if (!health) {
            continue;
        }
        if (health.build.ran && health.build.startedAt >= startedAt) {
            return health.build;
        }
    }
    return null;
}
//# sourceMappingURL=build-state.js.map