// The pixel unit gate: a hardcoded pixel value in a stylesheet is a value
// that does not follow the type scale and does not follow the theme.
// The allowed list holds the values that are deliberate, and each entry says
// why it is there.
// The script runs on every style file in styles/, including the event packs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const STYLES_DIR = path.join(ROOT, "styles");

const ALLOWED = [
  "--hairline-w",
  "--focus-ring",
  "--radius-chip",
  "--lens-max",
  "--glow-max",
  "border-radius: 999px",
  "blur(1px)",
  "clamp(",
  "transform-origin",
  "translateX(",
  "translateY(",
  "max(0px",
  "100vw - 1200px",
  "-9999px",
  "width: 1px",
  "height: 1px",
  /(?:border|outline)(?:-[a-z]+)*:\s*\d+px\s+solid/
];

const SKIPPED = new Set(["bundle.min.css"]);

function styleFiles(folder) {
  const found = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      for (const nested of styleFiles(full)) {
        found.push(nested);
      }
    } else if (entry.name.endsWith(".css") && !SKIPPED.has(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function isAllowed(context) {
  return ALLOWED.some(function (entry) {
    if (entry instanceof RegExp) {
      return entry.test(context);
    }
    return context.indexOf(entry) !== -1;
  });
}

if (!fs.existsSync(STYLES_DIR)) {
  console.error("UNIT CHECK FAIL: the styles folder is missing at " + STYLES_DIR);
  process.exit(1);
}

const failures = [];
const files = styleFiles(STYLES_DIR);
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const pattern = /\d+px/g;
  let match = pattern.exec(content);
  while (match !== null) {
    const start = Math.max(0, match.index - 60);
    const end = Math.min(content.length, match.index + match[0].length + 60);
    if (!isAllowed(content.slice(start, end))) {
      failures.push(path.relative(ROOT, file) + ": found '" + match[0] + "' outside the allowlist");
    }
    match = pattern.exec(content);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error("UNIT CHECK FAIL: " + failure);
  }
  process.exit(1);
}
console.log("Unit check passed: no disallowed px values in " + String(files.length) + " style files.");
