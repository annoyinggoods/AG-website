// Stages the AGnosis wasm bundle into the site tree.
//
// AGnosis is built in its own project, so the site cannot build the wasm
// itself. This script reads the web bundle that the project's own build
// wrote (`crates/agnosis-web/build-web.sh` -> `agnosis_web.js` plus
// `agnosis_web_bg.wasm`) and stages it under `wasm/agnosis/`, where the
// playground page loads it from the same origin with the `application/wasm`
// content type. A `file://` URL would refuse that content type, which is
// the lesson the project's own smoke server paid for.
//
// The glue and the module travel together and are served from one folder,
// because the glue fetches the module relative to itself. The stage is a
// plain copy — the wasm is a static asset like the nAG and drAGhts bundles
// are.
//
// When the sibling project is not on this machine, or its bundle has not
// been built yet, the script says so and stages nothing, because a build
// of the site must not depend on a sibling project being present (the
// same rule package-agnosis.mjs follows).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const AGNOSIS_PROJECT = process.env.AGNOSIS_PROJECT || "C:\\Projects\\AGnosis";
const BUNDLE_DIR = path.join(AGNOSIS_PROJECT, "crates", "agnosis-web", "dist");
const STAGE_DIR = path.join(ROOT, "wasm", "agnosis");

// The glue and the module: both files must be there, or the stage is
// an older bundle or a half-written one.
const FILES = ["agnosis_web.js", "agnosis_web_bg.wasm"];

function stageAgnosisWasm() {
  for (const name of FILES) {
    if (!fs.existsSync(path.join(BUNDLE_DIR, name))) {
      console.log(
        "AGnosis wasm not staged: the sibling project has no web bundle at " +
          BUNDLE_DIR +
          " (run crates/agnosis-web/build-web.sh there)."
      );
      return 0;
    }
  }
  fs.mkdirSync(STAGE_DIR, { recursive: true });
  let bytes = 0;
  for (const name of FILES) {
    const source = path.join(BUNDLE_DIR, name);
    const target = path.join(STAGE_DIR, name);
    fs.copyFileSync(source, target);
    bytes = bytes + fs.statSync(source).size;
  }
  return bytes;
}

// The file is also run on its own, so the build only runs when it is not
// imported by the site build.
const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const size = stageAgnosisWasm();
  console.log("wasm/agnosis: " + String(size) + " bytes staged.");
}

export { stageAgnosisWasm };
