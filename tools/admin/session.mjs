// The panel writes the files it changed into the work log. One helper run is
// one session, so the log gets one heading and a list under it.

import fs from "node:fs";
import { WORK_LOG } from "./paths.mjs";

let open = false;

function stamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 16);
}

function append(lines) {
  try {
    fs.appendFileSync(WORK_LOG, lines.join("\n") + "\n", "utf8");
  } catch (err) {
    void err;
  }
}

// The files of this session, named the way the log names them.
export function logChange(files) {
  if (files.length === 0) {
    return;
  }
  const lines = [];
  if (!open) {
    lines.push("", "## Session: control panel " + stamp());
    open = true;
  }
  for (const file of files) {
    lines.push("- Changed " + file + ".");
  }
  append(lines);
}

// The closing line of the session, written when the helper stops.
export function closeSession() {
  if (!open) {
    return;
  }
  open = false;
  append(["- The session closed."]);
}
