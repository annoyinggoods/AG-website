// The panel writes inside the project folder and nowhere else. A symbolic
// link may not lead out of the folder either.

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./paths.mjs";
import { rememberWrite } from "./touched.mjs";

// The nearest folder that exists, so a new file can be checked as well.
function nearestExisting(target) {
  let current = target;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return "";
    }
    current = parent;
  }
  return current;
}

function realPathOf(target) {
  const existing = nearestExisting(target);
  if (!existing) {
    return "";
  }
  try {
    return fs.realpathSync(existing);
  } catch (err) {
    void err;
    return "";
  }
}

// Every path the panel touches has to stay inside the given root.
export function resolveInside(root, relative) {
  const target = path.resolve(root, relative);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(prefix)) {
    return null;
  }
  const realRoot = realPathOf(root);
  const real = realPathOf(target);
  if (!realRoot || !real) {
    return null;
  }
  const realPrefix = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
  if (real !== realRoot && !real.startsWith(realPrefix)) {
    return null;
  }
  return target;
}

export function readText(target) {
  return fs.readFileSync(target, "utf8");
}

export function writeText(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const before = timeBefore(target);
  let attempt = 0;
  while (attempt < 10) {
    try {
      fs.writeFileSync(target, content, "utf8");
      rememberWrite(target, before, timeBefore(target));
      return;
    } catch (err) {
      attempt += 1;
      if (attempt === 10) {
        throw err;
      }
      pause(50);
    }
  }
}

// The time a file carried before the write, or zero for a file that did not
// exist yet.
function timeBefore(target) {
  try {
    return fs.statSync(target).mtimeMs;
  } catch (err) {
    void err;
    return 0;
  }
}

// Windows can hold a file for a moment while the preview reads it, so a
// write waits a little and tries again.
function pause(milliseconds) {
  const buffer = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buffer, 0, 0, milliseconds);
}

// The name of a file as the work log and the panel show it.
export function relativeToRoot(target) {
  return path.relative(ROOT, target).split(path.sep).join("/");
}
