// The panel boots in three views and never talks to anything except the
// local helper on the same machine.

import { fetchHealth, helperIsRunning } from "./api.js";
import { queryAll, required, setStatus } from "./dom.js";
import { startEditor } from "./editor.js";
import { startDeploy } from "./deploy.js";
import { startInspector } from "./inspector.js";
import type { HealthReport } from "./types.js";

function showView(name: string): void {
  const views = queryAll<HTMLElement>("[data-panel-view]");
  for (const view of views) {
    const active = view.dataset.panelView === name;
    view.hidden = !active;
  }
  const tabs = queryAll<HTMLButtonElement>("[data-panel-tab]");
  for (const tab of tabs) {
    tab.setAttribute("aria-pressed", tab.dataset.panelTab === name ? "true" : "false");
  }
}

function startTabs(): void {
  const tabs = queryAll<HTMLButtonElement>("[data-panel-tab]");
  for (const tab of tabs) {
    tab.addEventListener("click", function () {
      showView(String(tab.dataset.panelTab));
    });
  }
}

// The banner that says the build is older than the sources, and the buttons
// that must not be used while it is there.
function showBuildState(health: HealthReport | null): void {
  const banner = required<HTMLElement>("[data-panel-stale]");
  const save = required<HTMLButtonElement>("[data-inspector-save]");
  const create = required<HTMLButtonElement>("[data-editor-create]");
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

async function start(): Promise<void> {
  startTabs();
  showView("inspector");
  startInspector();
  startDeploy();
  await startEditor();
  const running = await helperIsRunning();
  if (!running) {
    showBuildState(null);
    setStatus("The helper is not running. The panel can still export the commands for a manual run.", "plain");
    return;
  }
  let health: HealthReport | null = null;
  try {
    health = await fetchHealth();
  } catch (err) {
    void err;
  }
  showBuildState(health);
  if (health && health.stale) {
    setStatus(health.staleReason, "error");
    return;
  }
  setStatus("The helper is running. Every view can write.", "ok");
}

void start();
