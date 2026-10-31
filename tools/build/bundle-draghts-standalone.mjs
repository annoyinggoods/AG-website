// Builds the drAGhts game into one classic script.
//
// The downloadable copy of the game has to run from a file:// URL, because
// that is what "unzip it and double click" means to a visitor. A browser
// will not load an ES module from a file:// URL, so the downloadable copy
// cannot be a module.
//
// This bundler wraps every module in a function that returns its exported
// names and wires them together, which gives one plain script with no module
// syntax in it at all. The wrapper is what keeps the modules apart: a name
// in one module can never collide with a name in another.
//
// The site copy addresses its audio and its logo with absolute root paths,
// because the site is served over HTTP. Those paths do not resolve from a
// file:// URL, so the standalone copy rewrites them to relative paths that
// point at the assets beside the page in the archive. drAGhts has no other
// standalone rewrite: there is no vendor step and no on-demand library.
//
// The site keeps its own module bundle, because a site page can load a
// module and gets the benefit of the browser caching the modules.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const GAME_DIR = path.join(ROOT, "scripts", "draghts");
const ENTRY = "main.js";
const OUTPUT = path.join(GAME_DIR, "draghts.standalone.js");

function fail(message) {
  console.error("DRAGHTS STANDALONE ERROR: " + message);
  process.exit(1);
}

/**
 * Every module of the game, keyed by the path the other modules use to reach
 * it.
 */
function collectModules(directory, prefix) {
  const modules = new Map();
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name;
    if (entry.isDirectory()) {
      const nested = collectModules(path.join(directory, name), prefix + name + "/");
      for (const [key, value] of nested) {
        modules.set(key, value);
      }
    } else if (name.endsWith(".js")) {
      modules.set(prefix + name, fs.readFileSync(path.join(directory, name), "utf8"));
    }
  }
  return modules;
}

/**
 * The import specifiers of a module. There are no dynamic imports: the game
 * fetches its audio with fetch() and falls back to an audio element.
 */
function importsOf(source) {
  const found = [];
  const staticRe = /^\s*import\s+(?:[^"';]*?from\s+)?["']([^"']+)["']\s*;?\s*$/gm;
  let match = staticRe.exec(source);
  while (match !== null) {
    found.push(match[1]);
    match = staticRe.exec(source);
  }
  const exportFromRe = /^\s*export\s*\{[^}]*\}\s*from\s*["']([^"']+)["']\s*;?\s*$/gm;
  match = exportFromRe.exec(source);
  while (match !== null) {
    found.push(match[1]);
    match = exportFromRe.exec(source);
  }
  return found;
}

/**
 * The names a module imports and the names it exports.
 */
function parseModule(source) {
  const imported = [];
  const importRe = /^\s*import\s+(?:type\s+)?\{([^}]*)\}\s*from\s+["']([^"']+)["']\s*;?\s*$/gm;
  let match = importRe.exec(source);
  while (match !== null) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (trimmed === "") {
        continue;
      }
      const alias = trimmed.split(/\s+as\s+/);
      imported.push({ local: alias[0].trim(), from: match[2] });
    }
    match = importRe.exec(source);
  }

  const exported = [];
  const declRe = /^\s*export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  match = declRe.exec(source);
  while (match !== null) {
    exported.push(match[1]);
    match = declRe.exec(source);
  }
  const braceRe = /^\s*export\s*\{([^}]*)\}\s*;?\s*$/gm;
  match = braceRe.exec(source);
  while (match !== null) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (trimmed === "") {
        continue;
      }
      const alias = trimmed.split(/\s+as\s+/);
      exported.push(alias[alias.length - 1].trim());
    }
    match = braceRe.exec(source);
  }
  const exportFromRe = /^\s*export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']\s*;?\s*$/gm;
  match = exportFromRe.exec(source);
  while (match !== null) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (trimmed === "") {
        continue;
      }
      const alias = trimmed.split(/\s+as\s+/);
      imported.push({ local: alias[0].trim(), from: match[2] });
      exported.push(alias[alias.length - 1].trim());
    }
    match = exportFromRe.exec(source);
  }

  return { imported, exported };
}

/**
 * Turns a module into the body of a function that returns its exports.
 *
 * The import statements go, because the names they bring in are passed in as
 * arguments. The export keywords go, because the exports are collected into
 * the returned object.
 */
function rewriteModule(source) {
  let out = source;
  out = out.replace(/^\s*import\s+[^;]*?from\s+["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/^\s*import\s+["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/^\s*export\s+(async\s+)?(function|const|let|var|class)\s/gm, "$1$2 ");
  out = out.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");
  out = out.replace(/^\s*export\s*\{[^}]*\}\s*from\s*["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/\/\/# sourceMappingURL=.*$/gm, "");
  return out;
}

/**
 * Resolves an import specifier against the folder of the importing module.
 */
function resolveSpecifier(specifier, fromKey) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromKey), specifier));
}

/**
 * Rewrites the absolute site asset paths to relative archive paths.
 *
 * The site copy addresses its audio and its logo from the site root, which
 * does not resolve from a file:// URL. The archive carries the same files
 * beside the page, so the standalone copy points at them relatively.
 */
function rewriteAssetPaths(source) {
  return source
    .split("/assets/draghts/audio/").join("assets/audio/")
    .split("/assets/draghts/draghts-logo.webp").join("assets/draghts-logo.webp");
}

export function buildDraghtsStandalone() {
  if (!fs.existsSync(GAME_DIR)) {
    fail("scripts/draghts/ is missing. Run the TypeScript build first.");
  }
  const modules = collectModules(GAME_DIR, "");
  if (!modules.has(ENTRY)) {
    fail("scripts/draghts/main.js is missing. Run the TypeScript build first.");
  }

  const parsed = new Map();
  for (const [key, source] of modules) {
    parsed.set(key, parseModule(source));
  }

  // The modules are written in dependency order, so a module is always
  // defined before the module that uses it.
  const order = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(key) {
    if (visited.has(key)) {
      return;
    }
    if (visiting.has(key)) {
      fail("The game module graph has a cycle at " + key + ".");
    }
    if (!modules.has(key)) {
      fail("The game module " + key + " is missing from scripts/draghts/.");
    }
    visiting.add(key);
    for (const specifier of importsOf(modules.get(key) ?? "")) {
      const target = resolveSpecifier(specifier, key);
      if (target === null) {
        continue;
      }
      if (modules.has(target)) {
        visit(target);
      } else if (modules.has(target + ".js")) {
        visit(target + ".js");
      } else {
        fail("The game module " + key + " imports " + specifier + ", which is not in scripts/draghts/.");
      }
    }
    visiting.delete(key);
    visited.add(key);
    order.push(key);
  }

  visit(ENTRY);

  const parts = [];
  const moduleVar = new Map();

  for (const key of order) {
    const name = "m_" + key.replace(/[^A-Za-z0-9]/g, "_").replace(/\.js$/, "");
    moduleVar.set(key, name);
    const info = parsed.get(key);

    // The names the module imports become the arguments of its function.
    // A name imported twice (a plain import plus a re-export of the same
    // name) is wired once: two arguments with one name are a syntax error.
    const args = [];
    const seen = new Set();
    for (const entry of info.imported) {
      if (seen.has(entry.local)) {
        continue;
      }
      seen.add(entry.local);
      const target = resolveSpecifier(entry.from, key);
      const targetKey = target !== null && modules.has(target)
        ? target
        : target !== null && modules.has(target + ".js")
          ? target + ".js"
          : null;
      if (targetKey === null) {
        fail("The game module " + key + " imports " + entry.local + " from " + entry.from + ", which is not in scripts/draghts/.");
      }
      args.push(entry.local + " = " + moduleVar.get(targetKey) + "." + entry.local);
    }

    let body = rewriteModule(modules.get(key) ?? "");
    body = rewriteAssetPaths(body);
    const returned = info.exported.map((symbol) => symbol + ": " + symbol).join(", ");
    parts.push(
      "// " + key + "\n" +
      "var " + name + " = (function (" + args.join(", ") + ") {\n" +
      body + "\nreturn { " + returned + " };\n})();",
    );
  }

  const bundle = parts.join("\n\n") + "\n";
  if (bundle.indexOf("assets/audio/") === -1) {
    fail("No rewritten audio path reached the standalone bundle, so the offline copy would load no audio.");
  }
  if (bundle.indexOf("/assets/draghts/") !== -1) {
    fail("An absolute /assets/draghts/ path survived into the standalone bundle, so the offline copy would not load from a file:// URL.");
  }
  fs.writeFileSync(OUTPUT, bundle, "utf8");
  return bundle.length;
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const size = buildDraghtsStandalone();
  console.log("scripts/draghts/draghts.standalone.js: " + String(size) + " bytes.");
}
