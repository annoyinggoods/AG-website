// The panel boots in four views and never talks to anything except the
// local helper on the same machine.
import { helperIsRunning } from "./api.js";
import { query, queryAll, setStatus } from "./dom.js";
import { readBuildState, showBuildState } from "./build-state.js";
import { startEditor } from "./editor.js";
import { startPageText } from "./page-text.js";
import { startDeploy } from "./deploy.js";
import { startInspector } from "./inspector.js";
import { allowDisconnect, startServerControl } from "./server-control.js";
// The tab list shows one view at a time. The views carry the hidden
// attribute, and the stylesheet keeps that attribute working, so the tab
// really does take the other views away.
function showView(name) {
    const views = queryAll("[data-panel-view]");
    for (const view of views) {
        view.hidden = view.dataset.panelView !== name;
    }
    const tabs = queryAll("[data-panel-tab]");
    for (const tab of tabs) {
        const active = tab.dataset.panelTab === name;
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
    }
}
// The tab that carries the focus, and the one that is selected, are always
// the same, so the arrow keys never leave the row.
function selectTab(tabs, index) {
    const target = tabs[index];
    if (!target) {
        return;
    }
    showView(String(target.dataset.panelTab));
    target.focus();
}
function moveTab(tabs, current, step) {
    const index = tabs.indexOf(current);
    const next = (index + step + tabs.length) % tabs.length;
    selectTab(tabs, next);
}
function moveTabToEdge(tabs, last) {
    selectTab(tabs, last ? tabs.length - 1 : 0);
}
function startTabs() {
    const tabs = queryAll("[data-panel-tab]");
    for (const tab of tabs) {
        tab.addEventListener("click", function () {
            showView(String(tab.dataset.panelTab));
        });
    }
    const list = query("[data-panel-tabs]");
    if (!list) {
        return;
    }
    list.addEventListener("keydown", function (event) {
        const current = document.activeElement;
        if (!(current instanceof HTMLButtonElement) || tabs.indexOf(current) === -1) {
            return;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            moveTab(tabs, current, 1);
            return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            moveTab(tabs, current, -1);
            return;
        }
        if (event.key === "Home") {
            event.preventDefault();
            moveTabToEdge(tabs, false);
            return;
        }
        if (event.key === "End") {
            event.preventDefault();
            moveTabToEdge(tabs, true);
        }
    });
}
async function start() {
    startTabs();
    showView("inspector");
    startInspector();
    startPageText();
    startDeploy();
    startServerControl();
    await startEditor();
    const running = await helperIsRunning();
    if (!running) {
        showBuildState(null);
        setStatus("The helper is not running. The panel can still export the commands for a manual run.", "plain");
        return;
    }
    allowDisconnect();
    const health = await readBuildState();
    showBuildState(health);
    if (health && health.stale) {
        setStatus(health.staleReason, "error");
        return;
    }
    const minutes = health ? health.idleTimeoutMinutes : 0;
    setStatus("The helper is running. Every view can write. It stops itself after " + String(minutes) + " idle minutes.", "ok");
}
void start();
//# sourceMappingURL=main.js.map