// The deploy side of the helper. It runs the script that already exists for
// the release and shows the answer of the server line by line. The password
// travels in the environment of the child process and never in a file.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT, SNAPSHOT_DIR } from "./paths.mjs";
import { readBody } from "./body.mjs";

// The newest snapshot folder of a past release, named after the release time.
export function newestSnapshot() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    return "";
  }
  const names = fs.readdirSync(SNAPSHOT_DIR).filter(function (name) {
    return fs.statSync(path.join(SNAPSHOT_DIR, name)).isDirectory();
  });
  if (names.length === 0) {
    return "";
  }
  names.sort(function (left, right) {
    const a = fs.statSync(path.join(SNAPSHOT_DIR, left)).mtimeMs;
    const b = fs.statSync(path.join(SNAPSHOT_DIR, right)).mtimeMs;
    return a - b;
  });
  return names[names.length - 1];
}

// The line that tells the operator where the snapshot of the build output
// went.
export function snapshotLine(mode) {
  if (mode !== "publish") {
    return "";
  }
  const name = newestSnapshot();
  if (name === "") {
    return "No snapshot folder was found in dist/snapshots/, so there is nothing to go back to.";
  }
  return "The snapshot of the build output is in dist/snapshots/" + name + ".";
}

function runDeploy(mode, settings, respond, finish) {
  const script = path.join(ROOT, "tools", "deploy", "publish.ps1");
  const args = [
    "-ExecutionPolicy", "Bypass",
    "-File", script,
    "-Mode", mode,
    "-Server", String(settings.server || ""),
    "-User", String(settings.user || ""),
    "-Folder", String(settings.folder || "/home/www/annoyinggoods"),
    "-Port", String(settings.port || 22)
  ];
  const child = spawn("powershell", args, {
    cwd: ROOT,
    env: Object.assign({}, process.env, { AG_DEPLOY_PASSWORD: String(settings.password || "") }),
    windowsHide: true
  });
  child.stdout.on("data", function (chunk) {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) {
        respond(line);
      }
    }
  });
  child.stderr.on("data", function (chunk) {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) {
        respond(line);
      }
    }
  });
  child.on("error", function (err) {
    respond("The deploy helper could not be started: " + err.message);
    finish();
  });
  child.on("close", function (code) {
    respond(code === 0 ? "The run finished with the code 0." : "The run finished with the code " + String(code) + ".");
    finish();
  });
}

export async function handleDeploy(request, response) {
  const body = await readBody(request);
  const mode = String(body.mode || "check");
  const settings = body.settings || {};
  response.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store"
  });
  let sent = false;
  function respond(line) {
    if (sent) {
      return;
    }
    response.write(JSON.stringify({ line: line }) + "\n");
  }
  try {
    runDeploy(mode, settings, respond, function () {
      const line = snapshotLine(mode);
      if (line !== "") {
        respond(line);
      }
      sent = true;
      response.end();
    });
  } catch (err) {
    respond(err instanceof Error ? err.message : String(err));
    sent = true;
    response.end();
  }
  response.on("close", function () {
    sent = true;
  });
}
