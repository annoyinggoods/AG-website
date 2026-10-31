// The panel refuses to work against a build that is older than the sources,
// because the preview would then show a page that is not the one on disk.

import fs from "node:fs";
import path from "node:path";
import { ROOT, SOURCE_DIR, STYLES_DIR, ENTRIES_DIR, BUILD_CONTENT_DIR, PARTIALS_DIR, TREE_FILE, SITE_CONFIG_FILE } from "./paths.mjs";
import { treePages } from "./tree.mjs";
import { rememberedTime } from "./touched.mjs";

export const STALE_MESSAGE = "The site build is older than the sources. Run npm run build before you change anything.";

const SOURCE_PATHS = [STYLES_DIR, SOURCE_DIR, ENTRIES_DIR, BUILD_CONTENT_DIR, TREE_FILE, SITE_CONFIG_FILE, PARTIALS_DIR];

// The bundle is written by the build into the style folder, so it is a build
// output and not a source. A source that the panel wrote itself carries the
// time it had before the write, so the panel never refuses its own work.
const BUILD_OUTPUTS = new Set(["styles/bundle.min.css"]);

// A file that carries a time close to the one the panel gave it still counts
// as the panel's own file.
const WRITE_TOLERANCE_MS = 2000;

// The time a source file counts with. A file the panel wrote counts with the
// time it had before the write, as long as nobody changed it since.
function timeOf(target) {
  let current = 0;
  try {
    current = fs.statSync(target).mtimeMs;
  } catch (err) {
    void err;
    return 0;
  }
  const remembered = rememberedTime(target);
  if (remembered === null) {
    return current;
  }
  if (current <= remembered.after + WRITE_TOLERANCE_MS) {
    return remembered.before;
  }
  return current;
}

// The newest source moment, with the build outputs and the panel's own writes
// left out.
function newestSourceMoment() {
  let newest = 0;
  for (const source of SOURCE_PATHS) {
    const value = sourceMoment(source);
    if (value > newest) {
      newest = value;
    }
  }
  return newest;
}

function sourceMoment(target) {
  if (!fs.existsSync(target)) {
    return 0;
  }
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return timeOf(target);
  }
  let newest = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    const relative = path.relative(ROOT, full).split(path.sep).join("/");
    if (BUILD_OUTPUTS.has(relative)) {
      continue;
    }
    const value = sourceMoment(full);
    if (value > newest) {
      newest = value;
    }
  }
  return newest;
}

// The state of the build against the sources.
export function buildStamp() {
  const newestSource = newestSourceMoment();
  const pages = treePages();
  if (pages.length === 0) {
    return { stale: true, reason: STALE_MESSAGE, newestSource: newestSource, oldestBuilt: 0 };
  }
  let oldestBuilt = Infinity;
  for (const page of pages) {
    const value = fs.statSync(page).mtimeMs;
    if (value < oldestBuilt) {
      oldestBuilt = value;
    }
  }
  const stale = newestSource > oldestBuilt;
  return {
    stale: stale,
    reason: stale ? STALE_MESSAGE : "",
    newestSource: newestSource,
    oldestBuilt: oldestBuilt
  };
}

// The paths the panel looks at, so the report can name them.
export function sourcePaths() {
  return SOURCE_PATHS.map(function (source) {
    return path.relative(ROOT, source).split(path.sep).join("/");
  });
}
