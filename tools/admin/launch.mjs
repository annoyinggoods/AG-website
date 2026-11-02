// The launcher of the control panel.
//
// It asks the port whether a helper is already there. If one is, it opens
// the panel page in the browser and stops, because the operator only wants
// the page back after closing the tab. If none is, it starts the helper and
// lets the helper open the page, so the page never has to be opened by hand.

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PORT = Number(process.env.ADMIN_PORT || 8787);
const HOST = "127.0.0.1";
const PANEL_URL = "http://" + HOST + ":" + String(PORT) + "/admin/";
const HERE = path.dirname(fileURLToPath(import.meta.url));

// The helper answers on this route, so a helper is only counted as running
// when it answers with its own report.
async function panelIsRunning() {
  try {
    const response = await fetch("http://" + HOST + ":" + String(PORT) + "/api/health", {
      signal: AbortSignal.timeout(2000)
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.json();
    return Boolean(body && body.ok);
  } catch (err) {
    void err;
    return false;
  }
}

// Another program can hold the port without being the panel.
function portIsTaken() {
  return new Promise(function (resolve) {
    const socket = net.connect({ host: HOST, port: PORT });
    socket.setTimeout(1500);
    socket.on("connect", function () {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", function () {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", function () {
      resolve(false);
    });
  });
}

function openBrowser(url) {
  if (process.platform !== "win32" || process.env.AG_ADMIN_NO_BROWSER === "1") {
    return;
  }
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

async function main() {
  if (await panelIsRunning()) {
    console.log("The control panel is already running on " + PANEL_URL);
    console.log("The page has been opened in the browser.");
    openBrowser(PANEL_URL);
    return;
  }
  if (await portIsTaken()) {
    console.log("The port " + String(PORT) + " is held by another program, so the panel did not start.");
    console.log("Close that program, or run the panel on another port with ADMIN_PORT.");
    process.exitCode = 1;
    return;
  }
  console.log("The control panel is starting on " + PANEL_URL);
  process.env.AG_ADMIN_OPEN = "1";
  await import(pathToFileURL(path.join(HERE, "server.mjs")).href);
}

void main();
