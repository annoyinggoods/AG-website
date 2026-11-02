// The build the panel starts after every change it makes.
// The output of the build goes into a log file, so the panel can tell the
// operator that the build failed and what it said, instead of leaving the
// change looking done while the site still shows the old page.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT } from "./paths.mjs";

const LOG_FILE = path.join(ROOT, "dist", "panel-build.log");
const LOG_LINES = 12;

function lastLines(text) {
  const lines = String(text || "").split(/\r?\n/).map(function (line) {
    return line.trim();
  }).filter(function (line) {
    return line.length > 0;
  });
  return lines.slice(-LOG_LINES).join("\n");
}

// Starts the build and writes its outcome into the log when it is done.
export function startBuild() {
  const startedAt = Date.now();
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const child = spawn(process.execPath, [path.join(ROOT, "tools", "build", "build.mjs")], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", function (chunk) {
    output = output + String(chunk);
  });
  child.stderr.on("data", function (chunk) {
    output = output + String(chunk);
  });
  child.on("error", function (err) {
    writeLog(startedAt, 1, "The build could not be started: " + err.message);
  });
  child.on("close", function (code) {
    writeLog(startedAt, code === null ? 1 : code, output);
  });
  return startedAt;
}

function writeLog(startedAt, code, output) {
  const text = [
    "Build started at " + new Date(startedAt).toISOString(),
    "Exit code: " + String(code),
    "",
    String(output || "")
  ].join("\n");
  fs.writeFileSync(LOG_FILE, text, "utf8");
}

// The outcome of the last build the panel started. The log is only written
// when a build is done, so a log that matches the start time means the build
// has finished.
export function lastBuild() {
  if (!fs.existsSync(LOG_FILE)) {
    return { ran: false, ok: false, code: 0, message: "", startedAt: 0 };
  }
  let text = "";
  try {
    text = fs.readFileSync(LOG_FILE, "utf8");
  } catch (err) {
    void err;
    return { ran: false, ok: false, code: 0, message: "", startedAt: 0 };
  }
  const startedMatch = /^Build started at (.+)$/m.exec(text);
  const codeMatch = /^Exit code: (-?\d+)/m.exec(text);
  const code = codeMatch ? Number(codeMatch[1]) : 1;
  const body = text.slice(text.indexOf("\n\n") + 2);
  const startedAt = startedMatch ? Date.parse(startedMatch[1]) : 0;
  return {
    ran: true,
    ok: code === 0,
    code: code,
    message: code === 0 ? "" : lastLines(body),
    startedAt: startedAt
  };
}
