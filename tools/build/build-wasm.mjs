import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const CRATE = path.join(ROOT, "wasm");
const PKG = path.join(CRATE, "pkg");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd: cwd, stdio: "inherit", shell: false });
  if (result.error) {
    console.error("BUILD WASM ERROR: " + command + " could not start: " + String(result.error.message));
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("BUILD WASM ERROR: " + command + " " + args.join(" ") + " exited with " + String(result.status));
    process.exit(result.status === null ? 1 : result.status);
  }
}

if (!fs.existsSync(path.join(CRATE, "Cargo.toml"))) {
  console.error("BUILD WASM ERROR: wasm/Cargo.toml is missing.");
  process.exit(1);
}

run("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], CRATE);

if (!fs.existsSync(path.join(CRATE, "target", "wasm32-unknown-unknown", "release", "ag_text_stats.wasm"))) {
  console.error("BUILD WASM ERROR: the release wasm artifact was not produced.");
  process.exit(1);
}

run("wasm-pack", ["build", "--target", "web", "--release", "--out-dir", "pkg"], CRATE);

if (!fs.existsSync(path.join(PKG, "ag_text_stats.js"))) {
  console.error("BUILD WASM ERROR: wasm/pkg/ag_text_stats.js is missing after wasm-pack.");
  process.exit(1);
}

console.log("WASM build complete: wasm/pkg/ag_text_stats.js");
